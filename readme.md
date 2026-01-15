# PDFolio Conversion Workspace

A small, composable **.NET 8** PDF conversion workspace built around a single interface (`IPdfConverter`) and multiple converter implementations (Aspose, LibreOffice headless, OpenOffice headless) that can be chained and wrapped with decorators (fallback, disk-save, missing-binary guard).

This repo currently contains:

- **Pdfolio.Conversion.Library** – the conversion library (contracts + implementations + reports)
- **Pdfolio.Conversion.Library.Demo** – a console demo app that converts one file or a folder and stores results in SQLite

---

## Why this exists

Most apps need “convert Office docs to PDF” and they need it in a way that is:

- **Pluggable** (swap converters per environment)
- **Observable** (conversion report, attempts, timing, hashes)
- **Resilient** (fallback strategy when binaries aren’t installed)
- **Safe to run on locked-down machines** (skip when LO/OO isn’t available; no hard crash)

---

## High-level design

### Core contract

All converters implement:

- `IPdfConverter`
  - `Name` – human readable converter name
  - `ConvertToPdfAsync(ConversionRequest)` – returns `ConversionResult` (PDF bytes + `ConversionReport`)

Key DTOs:

- `ConversionRequest`
  - `InputBytes`, `OriginalFileName`
  - optional metadata: `Extension`, `ContentType`, `CorrelationId`, `Tags`
  - optional disk-save support:
    - `OriginalFullPath`
    - `SavePdfNextToOriginal`
    - `OutputPdfFileName`
- `ConversionResult`
  - `PdfBytes`
  - `Report` (success/failure, timing, hashes, attempts, steps)
- `ConversionReport`
  - includes SHA256 hashes of input/output, converter attempts, steps, error details, etc.

---

## Converters included

### Aspose (in-memory)
**`AsposePdfConverter`**
- Converts from bytes → PDF bytes using:
  - Aspose.Words (doc/docx/rtf/txt)
  - Aspose.Cells (xls/xlsx/csv)
  - Aspose.Slides (ppt/pptx)
- Optional license support via `AsposeOptions.LicensePath`
- Runs fully in-memory (no temp files)

### LibreOffice headless (temp-file + process)
**`LibreOfficeHeadlessPdfConverter`**
- Writes input bytes to a temp working folder
- Executes `soffice` with `--headless --convert-to pdf`
- Reads produced PDF bytes back into memory
- Best-effort cleanup (unless `KeepTempOnFailure = true`)

### OpenOffice headless (temp-file + process)
**`OpenOfficeHeadlessPdfConverter`**
- Similar to LibreOffice converter, but includes:
  - isolated `UserInstallation` profile
  - `.com` launcher preference (helps process behavior on Windows)
  - polling for produced PDF (OpenOffice can exit before write completes)
  - default `KeepTempOnFailure = true` so you can inspect failures

---

## Composition utilities (wrappers)

### Auto-chain / ordered attempts
**`ChainPdfConverter`**
- Tries converters in order until one succeeds
- Produces a single unified `ConversionReport` including:
  - every attempt (Success / Failed / Missing)
  - timing
  - steps (“Attempt”, etc.)
- Throws `PdfConversionFailedException` with report if all fail

### Missing binary guard
**`MissingBinaryGuardConverter`**
- Wraps headless converters and translates “soffice missing/not runnable” failures into:
  - `ConverterMissingException`
- Useful when a machine is not allowed to install LibreOffice/OpenOffice

### Primary + fallback
**`FallbackPdfConverter`**
- Tries `_primary`, then `_fallback` if primary throws
- Used to support “installed soffice first, copied soffice as fallback” patterns

### Optional disk save decorator
**`DiskSavePdfConverter`**
- If `request.SavePdfNextToOriginal == true`, writes the PDF next to the original file
- **Never throws due to disk write failures**
  - instead it records a `ConversionStep` named `SavedPdfToDisk` with status info

---

## Factory

**`PdfConverterFactory`** is the single place that builds a converter pipeline for the environment.

Supported `Mode` values:

- `Auto` (default): **Aspose → LibreOffice → OpenOffice**
- `Aspose`
- `LibreOffice` / `lo`
- `OpenOffice` / `oo`

Factory also supports:

- discovery of soffice paths via:
  - `SOFFICE_PATH` (LibreOffice)
  - `OPENOFFICE_SOFFICE_PATH` (OpenOffice)
  - common install directories
  - registry (best effort)
- optional fallback soffice binaries (copied EXEs)
- optional disk-save wrapper via `EnableDiskSave`

---

## Demo app

Project: **Pdfolio.Conversion.Library.Demo**

What it does:
- Reads config (`appsettings.json` + env vars)
- Ensures SQLite schema exists (embedded SQL migrations)
- Ingests files into a `FileArchive` table (stores original bytes + sha256)
- Converts each file to PDF using the factory pipeline
- Writes results to DB:
  - success → `PdfBlob`, `PdfConverterUsed`, `PdfReportJson`
  - fail → `PdfStatus`, `PdfError`, `PdfErrorJson`
  - missing converter → skips and leaves record pending (status 0)

### Run

Convert a single file:
```bash
dotnet run -- "..\Pdfolio.TestFiles\sample.docx"
````

Convert all files in a folder:

```bash
dotnet run -- --folder "..\Pdfolio.TestFiles"
```

> The demo prints out the resolved SQLite DB path and whether disk-save is enabled.

---

## Configuration (Demo)

The demo uses these settings (names based on the code):

* `ConnectionStrings:BackupDb`
  SQLite connection string (relative paths are resolved to the EXE directory)

* `Pdf:TempPath`
  Temp working folder used by LibreOffice/OpenOffice converters

* `Pdf:TimeoutSeconds`
  Process timeout for headless converters (default 60)

* `Pdf:Mode`
  Auto | Aspose | LibreOffice | OpenOffice

* `Pdf:AsposeLicensePath`
  Optional Aspose license file path (relative allowed)

* `Pdf:LibreOffice:SofficePath`

* `Pdf:LibreOffice:FallbackSofficePath`

* `Pdf:OpenOffice:SofficePath`

* `Pdf:OpenOffice:FallbackSofficePath`

* `Pdf:KeepTempOnFailure`
  When true, temp folders are retained for inspection

* `Pdf:SavePdfNextToOriginal`
  When true, the demo requests disk-save behavior (writes PDF next to source file)

Environment variable overrides (locators):

* `SOFFICE_PATH` (LibreOffice)
* `OPENOFFICE_SOFFICE_PATH` (OpenOffice)

---

## Database

The library/demo uses SQLite with an embedded migration runner:

* `SqlBootstrapper`

  * runs embedded SQL scripts in order
  * tracks applied scripts in `SchemaMigrations`

Repository:

* `FileArchiveRepository`

  * `InsertFileAsync(FileInfo file)`
  * `GetPendingPdfAsync()`
  * `MarkPdfSuccessAsync(...)`
  * `MarkPdfFailedAsync(...)`

---

## Typical usage in code (library consumer)

```csharp
using Pdfolio.Conversion.Factory;
using Pdfolio.Conversion.Models;

var converter = PdfConverterFactory.Create(new PdfConverterFactory.PdfConverterFactoryOptions(
    TempPath: @"C:\temp\pdfolio",
    TimeoutSeconds: 60,
    Mode: "Auto",
    Aspose: new PdfConverterFactory.AsposeOptions(LicensePath: @"licenses\Aspose.Total.lic"),
    KeepTempOnFailure: true,
    EnableDiskSave: false
));

var req = new ConversionRequest(
    InputBytes: File.ReadAllBytes(@"C:\in\sample.docx"),
    OriginalFileName: "sample.docx",
    Extension: ".docx",
    CorrelationId: "example:001",
    Tags: new Dictionary<string,string> { ["source"] = "my-app" }
);

var result = await converter.ConvertToPdfAsync(req);
File.WriteAllBytes(@"C:\out\sample.pdf", result.PdfBytes);
```

---

## Roadmap / next steps

* Finish the “thread” on the demo project (polish config + sample files + README examples)
* Add unit/integration tests per converter
* Add structured logging hooks (optional) around attempts/steps
* Add support for more input types (images → PDF, HTML → PDF, etc.) if needed
* Package as NuGet for easy reuse across EVSuite apps

---

## License / Notes

* Aspose converters require Aspose packages and will run in evaluation mode if no license is provided.
* LibreOffice/OpenOffice converters require a runnable `soffice` binary on the host (or configured fallback binary path).
