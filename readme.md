````md
# PDFolio Conversion Workspace

A small, composable **.NET 8** PDF conversion workspace built around a single interface (`IPdfConverter`) and multiple converter implementations (Aspose, LibreOffice headless, OpenOffice headless).  
Designed for **resilient**, **observable**, and **environment-flexible** document-to-PDF conversion.

This workspace currently contains:

- **Pdfolio.Conversion.Library** – core conversion library (contracts, converters, reports, persistence helpers)
- **Pdfolio.Conversion.Library.Demo** – console demo app that exercises the pipeline and persists results to SQLite

---

## Why this exists

Most enterprise apps eventually need *“convert Office docs to PDF”*, but that requirement usually comes with constraints:

- Different environments (dev laptops, locked-down servers, CI agents)
- Optional commercial dependencies (Aspose)
- External binaries that may or may not exist (LibreOffice / OpenOffice)
- A need for **auditability** (what ran, how long, why it failed)

PDFolio addresses this by providing:

- **Pluggable converters**
- **Ordered fallback strategies**
- **Structured conversion reports**
- **Non-fatal handling of missing binaries**
- **Optional disk-save behavior without breaking callers**

---

## High-level architecture

### Core abstraction

All converters implement:

```csharp
public interface IPdfConverter
{
    string Name { get; }

    Task<ConversionResult> ConvertToPdfAsync(
        ConversionRequest request,
        CancellationToken ct = default
    );
}
````

This keeps consumers isolated from *how* the conversion happens.

---

## Key models

### ConversionRequest

* Input:

  * `InputBytes`
  * `OriginalFileName`
* Optional metadata:

  * `Extension`, `ContentType`
  * `CorrelationId`
  * `Tags`
* Optional disk-save support:

  * `OriginalFullPath`
  * `SavePdfNextToOriginal`
  * `OutputPdfFileName`

### ConversionResult

* `PdfBytes`
* `ConversionReport`

### ConversionReport

Captures everything needed for debugging and audit:

* Timing (`StartedAt`, `FinishedAt`, `DurationMs`)
* SHA-256 hashes (input + output)
* Converter attempts (success / failure / missing)
* Steps (attempts, disk save, etc.)
* Error type + message (on failure)

---

## Converters

### Aspose (in-memory)

**`AsposePdfConverter`**

* Uses:

  * Aspose.Words
  * Aspose.Cells
  * Aspose.Slides
* Fully in-memory
* Optional license file
* Fastest / cleanest path when licensed

---

### LibreOffice headless

**`LibreOfficeHeadlessPdfConverter`**

* Writes input bytes to a temp working directory
* Executes `soffice --headless --convert-to pdf`
* Reads produced PDF bytes back into memory
* Optional temp retention on failure

---

### OpenOffice headless

**`OpenOfficeHeadlessPdfConverter`**

* Similar to LibreOffice but with:

  * isolated profile directory
  * `.com` launcher preference on Windows
  * polling for delayed PDF writes
  * defaults to keeping temp files on failure

---

## Composition & decorators

### Chain / ordered attempts

**`ChainPdfConverter`**

* Tries multiple converters in order
* Produces a single unified report
* Throws `PdfConversionFailedException` only after all attempts fail

Typical chain:

```
Aspose → LibreOffice → OpenOffice
```

---

### Missing binary guard

**`MissingBinaryGuardConverter`**

* Detects “soffice missing / not runnable” failures
* Translates them into `ConverterMissingException`
* Allows callers to *skip* conversion without marking it failed

---

### Primary + fallback

**`FallbackPdfConverter`**

* Tries primary converter
* Falls back to secondary converter if primary throws
* Used for copied/embedded soffice scenarios

---

### Optional disk save decorator

**`DiskSavePdfConverter`**

* Saves the produced PDF beside the original file *if requested*
* Never throws due to IO errors
* Records success/failure as a `ConversionStep`

---

## Factory

**`PdfConverterFactory`** is the single entry point for building converters.

Supported modes:

* `Auto` (default): Aspose → LibreOffice → OpenOffice
* `Aspose`
* `LibreOffice` / `lo`
* `OpenOffice` / `oo`

The factory also:

* discovers soffice binaries
* supports fallback binaries
* optionally wraps converters with disk-save behavior

---

## Demo application

**Project:** `Pdfolio.Conversion.Library.Demo`

What it demonstrates:

* Config-driven converter creation
* SQLite ingestion of original files
* PDF conversion with fallback
* Persisting:

  * PDF blobs
  * conversion reports
  * failure diagnostics
* Optional “save PDF next to original” behavior

---

## Demo configuration

### `Pdfolio.Conversion.Library.Demo/appsettings.json`

```json
{
  "ConnectionStrings": {
    "BackupDb": "Data Source=./Data/PdfolioBackup.db"
  },
  "Pdf": {
    "SavePdfNextToOriginal": true,
    "Mode": "Auto",
    "TimeoutSeconds": 60,
    "TempPath": "Temp\\Pdfolio",
    "KeepTempOnFailure": true,
    "AsposeLicensePath": "..\\Pdfolio.Conversion.Library\\licenses\\aspose.lic",
    "LibreOffice": {
      "SofficePath": "",
      "FallbackSofficePath": ""
    },
    "OpenOffice": {
      "SofficePath": "C:\\Program Files (x86)\\OpenOffice 4\\program\\soffice.exe",
      "FallbackSofficePath": ""
    }
  }
}
```

---

### What these settings do

#### SQLite

* `ConnectionStrings:BackupDb`

  * Local SQLite DB used by the demo
  * Relative paths resolve to the **EXE directory**
  * Final path:

    ```
    <exe>\Data\PdfolioBackup.db
    ```

#### PDF settings

* `SavePdfNextToOriginal`

  * Enables disk-save behavior via `DiskSavePdfConverter`
  * PDFs are written beside source files

* `Mode`

  * Converter strategy (`Auto` recommended)

* `TimeoutSeconds`

  * Headless process timeout

* `TempPath`

  * Temp working directory for LO/OO
  * Relative to EXE directory

* `KeepTempOnFailure`

  * Retains temp folders for post-mortem debugging

* `AsposeLicensePath`

  * Optional Aspose license
  * Relative to EXE directory

#### LibreOffice / OpenOffice

* If `SofficePath` is blank:

  * Environment variables
  * Common install paths
  * Registry
  * PATH lookup (`soffice.exe`)
* Explicit paths override discovery

Environment variable overrides:

```text
SOFFICE_PATH
OPENOFFICE_SOFFICE_PATH
```

---

## Running the demo

Convert a single file:

```bash
dotnet run -- "..\Pdfolio.TestFiles\sample.docx"
```

Convert a folder:

```bash
dotnet run -- --folder "..\Pdfolio.TestFiles"
```

---

## Typical library usage

```csharp
var converter = PdfConverterFactory.Create(
    new PdfConverterFactory.PdfConverterFactoryOptions(
        TempPath: @"C:\temp\pdfolio",
        Mode: "Auto",
        KeepTempOnFailure: true
    )
);

var result = await converter.ConvertToPdfAsync(
    new ConversionRequest(
        InputBytes: File.ReadAllBytes("sample.docx"),
        OriginalFileName: "sample.docx"
    )
);
```

---

## Status & next steps

* Demo wiring complete
* Conversion pipeline stable
* Next logical steps:

  * Add automated tests
  * NuGet packaging
  * Structured logging hooks
  * Containerized headless conversion service

---

**PDFolio** is intentionally boring infrastructure: predictable, inspectable, and hard to break.
That’s the point.

```

If you want, next we can:
- split this into **Library README** + **Demo README**, or  
- add an **architecture diagram** section that explains the chain/fallback visually.
```
