using System.Text.Json;
using Microsoft.Extensions.Configuration;
using Microsoft.Data.Sqlite;
using Pdfolio.Conversion.Factory;
using Pdfolio.Conversion.Models;
using Pdfolio.Conversion.Exceptions;

// SQLite backup DB types live in your library project
using Pdfolio.Conversion.Library.Data;

static string NormalizeSqliteConnectionString(string rawConnString)
{
    var csb = new SqliteConnectionStringBuilder(rawConnString);

    if (string.IsNullOrWhiteSpace(csb.DataSource))
        throw new InvalidOperationException("SQLite connection string missing Data Source.");

    // Make relative paths relative to the EXE folder (stable for dotnet run + VS)
    if (!Path.IsPathRooted(csb.DataSource))
        csb.DataSource = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, csb.DataSource));

    // Ensure parent directory exists so SQLite can create the db + wal/shm files
    var dir = Path.GetDirectoryName(csb.DataSource);
    if (!string.IsNullOrWhiteSpace(dir))
        Directory.CreateDirectory(dir);

    // Ensure we can create if missing
    if (csb.Mode == SqliteOpenMode.ReadOnly)
        csb.Mode = SqliteOpenMode.ReadWriteCreate;

    // Helps avoid some locking pain in demos (safe default)
    csb.Cache = SqliteCacheMode.Shared;

    return csb.ToString();
}


static string ResolvePath(string? pathFromConfig, string defaultRelativeToExe)
{
    var p = string.IsNullOrWhiteSpace(pathFromConfig) ? defaultRelativeToExe : pathFromConfig;

    if (!Path.IsPathRooted(p))
        p = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, p));

    Directory.CreateDirectory(p);
    return p;
}

static string ToFullPathFromCwd(string path)
{
    if (Path.IsPathRooted(path))
        return path;

    return Path.GetFullPath(Path.Combine(Environment.CurrentDirectory, path));
}


static void PrintUsage()
{
    Console.WriteLine("Usage:");
    Console.WriteLine("  dotnet run -- <filePath>");
    Console.WriteLine("  dotnet run -- --folder <folderPath>");
    Console.WriteLine();
    Console.WriteLine("Examples:");
    Console.WriteLine(@"  dotnet run -- ""..\Pdfolio.TestFiles\sample.docx""");
    Console.WriteLine(@"  dotnet run -- --folder ""..\Pdfolio.TestFiles""");
}

string? fileArg = null;
string? folderArg = null;

if (args.Length == 0)
{
    PrintUsage();
    return;
}

if (args.Length >= 2 && args[0].Equals("--folder", StringComparison.OrdinalIgnoreCase))
{
    folderArg = args[1];
}
else
{
    fileArg = args[0];
}

// ---------------------------
// Config
// ---------------------------
var config = new ConfigurationBuilder()
    .SetBasePath(AppContext.BaseDirectory)
    .AddJsonFile("appsettings.json", optional: false)
    .AddEnvironmentVariables()
    .Build();

var rawBackupConn = config.GetConnectionString("BackupDb")
    ?? throw new InvalidOperationException("Missing ConnectionStrings:BackupDb in appsettings.json");

var backupConn = NormalizeSqliteConnectionString(rawBackupConn);

// Optional: print where it will create the DB
var dbg = new SqliteConnectionStringBuilder(backupConn);
Console.WriteLine("[DB] BackupDb = " + dbg.DataSource);


// ---------------------------
// Ensure DB + repo
// ---------------------------
await SqlBootstrapper.EnsureDatabaseAndMigrateAsync(backupConn);
var repo = new FileArchiveRepository(backupConn);

// ---------------------------
// Build converter
// ---------------------------
var tempPath = ResolvePath(config["Pdf:TempPath"], Path.Combine("Temp", "Pdfolio"));

var options = new PdfConverterFactory.PdfConverterFactoryOptions(
    TempPath: tempPath,
    TimeoutSeconds: config.GetValue("Pdf:TimeoutSeconds", 60),
    Mode: config["Pdf:Mode"] ?? "Auto",
    Aspose: new PdfConverterFactory.AsposeOptions(config["Pdf:AsposeLicensePath"]),
    LibreOffice: new PdfConverterFactory.OfficeBinaryOptions(
        SofficePath: config["Pdf:LibreOffice:SofficePath"],
        FallbackSofficePath: config["Pdf:LibreOffice:FallbackSofficePath"]
    ),
    OpenOffice: new PdfConverterFactory.OfficeBinaryOptions(
        SofficePath: config["Pdf:OpenOffice:SofficePath"],
        FallbackSofficePath: config["Pdf:OpenOffice:FallbackSofficePath"]
    ),
    KeepTempOnFailure: config.GetValue("Pdf:KeepTempOnFailure", true)
);

var converter = PdfConverterFactory.Create(options);

// ---------------------------
// Resolve inputs
// ---------------------------
List<string> filesToConvert = new();

if (!string.IsNullOrWhiteSpace(folderArg))
{
    var folder = ToFullPathFromCwd(folderArg);
    if (!Directory.Exists(folder))
    {
        Console.WriteLine("Folder not found: " + folder);
        return;
    }

    filesToConvert = Directory.EnumerateFiles(folder, "*", SearchOption.TopDirectoryOnly)
        .OrderBy(p => p, StringComparer.OrdinalIgnoreCase)
        .ToList();

    if (filesToConvert.Count == 0)
    {
        Console.WriteLine("No files found in: " + folder);
        return;
    }
}
else
{
    var file = ToFullPathFromCwd(fileArg!);
    if (!File.Exists(file))
    {
        Console.WriteLine("File not found: " + file);
        return;
    }
    filesToConvert.Add(file);
}

Console.WriteLine($"Files to convert: {filesToConvert.Count}");

// ---------------------------
// Convert loop
// ---------------------------
var jsonOpts = new JsonSerializerOptions(JsonSerializerDefaults.Web) { WriteIndented = false };

int ok = 0, fail = 0, skip = 0;

foreach (var path in filesToConvert)
{
    var fi = new FileInfo(path);
    Console.WriteLine();
    Console.WriteLine("------------------------------------------------------------");
    Console.WriteLine("Input: " + fi.FullName);

    long id;
    try
    {
        id = await repo.InsertFileAsync(fi);
    }
    catch (Exception ex)
    {
        Console.WriteLine("DB ingest failed: " + ex.Message);
        fail++;
        continue;
    }

    var bytes = await File.ReadAllBytesAsync(fi.FullName);

    var req = new ConversionRequest(
        InputBytes: bytes,
        OriginalFileName: fi.Name,
        Extension: fi.Extension,
        ContentType: null,
        CorrelationId: $"demo:{id}",
        Tags: new Dictionary<string, string>
        {
            ["source"] = "Pdfolio.Conversion.Library.Demo",
            ["rowId"] = id.ToString()
        }
    );

    try
    {
        var result = await converter.ConvertToPdfAsync(req);

        var reportJson = JsonSerializer.SerializeToUtf8Bytes(result.Report, jsonOpts);

        await repo.MarkPdfSuccessAsync(
            id: id,
            pdfBytes: result.PdfBytes,
            converterUsed: result.Report.SuccessfulConverter,
            reportJson: reportJson
        );

        Console.WriteLine($"SUCCESS: Id={id} Converter={result.Report.SuccessfulConverter} PdfBytes={result.PdfBytes.Length}");
        ok++;
    }
    catch (ConverterMissingException ex)
    {
        // Keep pending (status 0). Useful if LO/OO isn't installed on this machine.
        Console.WriteLine($"SKIP (converter missing): {ex.Message}");
        skip++;
    }
    catch (PdfConversionFailedException ex)
    {
        var errorJson = JsonSerializer.SerializeToUtf8Bytes(ex.Report, jsonOpts);

        await repo.MarkPdfFailedAsync(
            id: id,
            error: ex.Message,
            converterUsed: ex.Report.SuccessfulConverter,
            errorJson: errorJson
        );

        Console.WriteLine($"FAILED: Id={id} {ex.Message}");
        fail++;
    }
    catch (Exception ex)
    {
        var errorObj = new { message = ex.Message, type = ex.GetType().FullName, stack = ex.StackTrace };
        var errorJson = JsonSerializer.SerializeToUtf8Bytes(errorObj, jsonOpts);

        await repo.MarkPdfFailedAsync(
            id: id,
            error: ex.Message,
            converterUsed: null,
            errorJson: errorJson
        );

        Console.WriteLine($"FAILED: Id={id} {ex.Message}");
        fail++;
    }
}

Console.WriteLine();
Console.WriteLine($"Done. OK={ok} FAIL={fail} SKIP={skip}");
