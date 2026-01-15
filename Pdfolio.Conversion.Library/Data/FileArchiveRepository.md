using System.Security.Cryptography;
using Microsoft.Data.Sqlite;

namespace Pdfolio.Conversion.Library.Data;

public sealed class FileArchiveRepository
{
    private readonly string _connString;

    public FileArchiveRepository(string connString)
    {
        _connString = connString;
    }

    public sealed record PendingPdfRow(
        long Id,
        string? OriginalFullPath,
        string OriginalFileName,
        string? OriginalExtension,
        string? ContentType,
        byte[] OriginalBlob
    );

    public async Task TrackFileExtensionConversionAsync(string? extension)
    {
        var ext = NormalizeExtension(extension);
        if (ext is null)
            return;

        const string sql = @"
INSERT INTO FileExtensions
(
    Extension,
    ConversionCount,
    FirstSeenUtc,
    LastSeenUtc
)
VALUES
(
    $Ext,
    1,
    $Now,
    $Now
)
ON CONFLICT(Extension) DO UPDATE SET
    ConversionCount = ConversionCount + 1,
    LastSeenUtc = $Now;
";

        await using var conn = new SqliteConnection(_connString);
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;

        cmd.Parameters.AddWithValue("$Ext", ext);
        cmd.Parameters.AddWithValue("$Now", DateTime.UtcNow.ToString("O"));

        await cmd.ExecuteNonQueryAsync();
    }

    private static string? NormalizeExtension(string? extension)
    {
        if (string.IsNullOrWhiteSpace(extension))
            return null;

        var ext = extension.Trim();

        if (!ext.StartsWith('.'))
            ext = "." + ext;

        ext = ext.ToLowerInvariant();

        // sanity: "." alone is useless
        if (ext.Length < 2)
            return null;

        return ext;
    }


    public async Task<long> InsertFileAsync(FileInfo file)
    {
        byte[] bytes = await File.ReadAllBytesAsync(file.FullName);
        byte[] sha256 = SHA256.HashData(bytes);

        const string sql = @"
INSERT INTO FileArchive
(
OriginalFullPath,
OriginalFileName,
OriginalExtension,
ContentType,
FileSizeBytes,
FileCreatedUtc,
FileModifiedUtc,
Sha256,
OriginalBlob,
PdfStatus
)
VALUES
(
$OriginalFullPath,
$OriginalFileName,
$OriginalExtension,
$ContentType,
$FileSizeBytes,
$FileCreatedUtc,
$FileModifiedUtc,
$Sha256,
$OriginalBlob,
0
)
ON CONFLICT(Sha256) DO NOTHING;

SELECT Id
FROM FileArchive
WHERE Sha256 = $Sha256
LIMIT 1;";

        await using var conn = new SqliteConnection(_connString);
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;

        cmd.Parameters.AddWithValue("$OriginalFullPath", (object?)file.FullName ?? DBNull.Value);
        cmd.Parameters.AddWithValue("$OriginalFileName", file.Name);
        cmd.Parameters.AddWithValue("$OriginalExtension", file.Extension);
        cmd.Parameters.AddWithValue("$ContentType", GuessContentType(file.Extension) ?? (object)DBNull.Value);

        cmd.Parameters.AddWithValue("$FileSizeBytes", file.Length);
        cmd.Parameters.AddWithValue("$FileCreatedUtc", file.CreationTimeUtc.ToString("O"));
        cmd.Parameters.AddWithValue("$FileModifiedUtc", file.LastWriteTimeUtc.ToString("O"));

        cmd.Parameters.Add("$Sha256", SqliteType.Blob).Value = sha256;
        cmd.Parameters.Add("$OriginalBlob", SqliteType.Blob).Value = bytes;

        var idObj = await cmd.ExecuteScalarAsync();
        if (idObj is null)
            throw new InvalidOperationException("Insert/select failed to return an Id.");

        return Convert.ToInt64(idObj);
    }

    public async Task<List<PendingPdfRow>> GetPendingPdfAsync(int take = 25)
    {
        const string sql = @"
SELECT
Id,
OriginalFullPath,
OriginalFileName,
OriginalExtension,
ContentType,
OriginalBlob
FROM FileArchive
WHERE PdfBlob IS NULL AND PdfStatus = 0
ORDER BY Id
LIMIT $Take;";

        var results = new List<PendingPdfRow>();

        await using var conn = new SqliteConnection(_connString);
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("$Take", take);

        await using var r = await cmd.ExecuteReaderAsync();
        while (await r.ReadAsync())
        {
            var id = r.GetInt64(0);
            var fullPath = r.IsDBNull(1) ? null : r.GetString(1);
            var name = r.GetString(2);
            var ext = r.IsDBNull(3) ? null : r.GetString(3);
            var ct = r.IsDBNull(4) ? null : r.GetString(4);
            var blob = (byte[])r["OriginalBlob"];

            results.Add(new PendingPdfRow(id, fullPath, name, ext, ct, blob));
        }

        return results;
    }

    public async Task TrackFileExtensionConversionAsync(string? extension)
    {
        var ext = NormalizeExtension(extension);
        if (ext is null)
            return;

        const string sql = @"
INSERT INTO FileExtensions
(
    Extension,
    ConversionCount,
    FirstSeenUtc,
    LastSeenUtc
)
VALUES
(
    $Ext,
    1,
    $Now,
    $Now
)
ON CONFLICT(Extension) DO UPDATE SET
    ConversionCount = ConversionCount + 1,
    LastSeenUtc = $Now;
";

        await using var conn = new SqliteConnection(_connString);
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;

        cmd.Parameters.AddWithValue("$Ext", ext);
        cmd.Parameters.AddWithValue("$Now", DateTime.UtcNow.ToString("O"));

        await cmd.ExecuteNonQueryAsync();
    }

    private static string? NormalizeExtension(string? extension)
    {
        if (string.IsNullOrWhiteSpace(extension))
            return null;

        var ext = extension.Trim();

        if (!ext.StartsWith('.'))
            ext = "." + ext;

        ext = ext.ToLowerInvariant();

        // sanity: "." alone is useless
        return ext.Length < 2 ? null : ext;
    }

    public async Task MarkPdfSuccessAsync(long id, byte[] pdfBytes, string? converterUsed, byte[]? reportJson)
    {
        const string sql = @"
UPDATE FileArchive
SET
PdfBlob = $PdfBlob,
PdfConvertedUtc = $PdfConvertedUtc,
PdfStatus = 1,
PdfError = NULL,
PdfConverterUsed = $PdfConverterUsed,
PdfReportJson = $PdfReportJson,
PdfErrorJson = NULL
WHERE Id = $Id;";

        await using var conn = new SqliteConnection(_connString);
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;

        cmd.Parameters.AddWithValue("$Id", id);
        cmd.Parameters.AddWithValue("$PdfConvertedUtc", DateTime.UtcNow.ToString("O"));
        cmd.Parameters.Add("$PdfBlob", SqliteType.Blob).Value = pdfBytes;

        cmd.Parameters.AddWithValue("$PdfConverterUsed", (object?)converterUsed ?? DBNull.Value);
        cmd.Parameters.Add("$PdfReportJson", SqliteType.Blob).Value = (object?)reportJson ?? DBNull.Value;

        await cmd.ExecuteNonQueryAsync();
    }

    public async Task MarkPdfFailedAsync(long id, string error, string? converterUsed, byte[]? errorJson)
    {
        const string sql = @"
UPDATE FileArchive
SET
PdfStatus = 2,
PdfError = $Err,
PdfConverterUsed = $PdfConverterUsed,
PdfErrorJson = $PdfErrorJson
WHERE Id = $Id;";

        await using var conn = new SqliteConnection(_connString);
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;

        cmd.Parameters.AddWithValue("$Id", id);
        cmd.Parameters.AddWithValue("$Err", error.Length > 2000 ? error[..2000] : error);
        cmd.Parameters.AddWithValue("$PdfConverterUsed", (object?)converterUsed ?? DBNull.Value);
        cmd.Parameters.Add("$PdfErrorJson", SqliteType.Blob).Value = (object?)errorJson ?? DBNull.Value;

        await cmd.ExecuteNonQueryAsync();
    }

    private static string? GuessContentType(string extension)
    {
        return extension.ToLowerInvariant() switch
        {
            ".txt" => "text/plain",
            ".pdf" => "application/pdf",
            ".doc" => "application/msword",
            ".docx" => "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
            ".xls" => "application/vnd.ms-excel",
            ".xlsx" => "application/vnd.openxmlformats-officedocument.spreadsheetml.sheet",
            ".ppt" => "application/vnd.ms-powerpoint",
            ".pptx" => "application/vnd.openxmlformats-officedocument.presentationml.presentation",
            ".jpg" or ".jpeg" => "image/jpeg",
            ".png" => "image/png",
            _ => null
        };
    }
}
