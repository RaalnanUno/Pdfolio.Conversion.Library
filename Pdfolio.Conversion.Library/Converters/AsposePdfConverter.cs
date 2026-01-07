using System.IO;
using System.Threading;
using System.Threading.Tasks;

using Aspose.Words;
using Aspose.Cells;
using Aspose.Slides;

using Pdfolio.Conversion.Abstractions;
using Pdfolio.Conversion.Models;
using Pdfolio.Conversion.Utility;

namespace Pdfolio.Conversion.Converters;

public sealed class AsposePdfConverter : IPdfConverter
{
    private static int _licenseAttempted; // 0/1

    private readonly string? _licensePath;

    public AsposePdfConverter(string? licensePath = null)
    {
        _licensePath = string.IsNullOrWhiteSpace(licensePath) ? null : licensePath;
    }

    public string Name => "Aspose";

    public Task<ConversionResult> ConvertToPdfAsync(ConversionRequest request, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        EnsureAsposeLicenseLoaded(_licensePath);

        var correlationId = string.IsNullOrWhiteSpace(request.CorrelationId)
            ? Guid.NewGuid().ToString("N")
            : request.CorrelationId!;

        var startedAt = DateTimeOffset.UtcNow;

        var ext = NormalizeExtension(request.Extension, request.OriginalFileName) ?? ".bin";

        byte[] pdfBytes = ext switch
        {
            ".doc" or ".docx" or ".rtf" or ".txt" => ConvertWords(request.InputBytes),
            ".xls" or ".xlsx" or ".csv"           => ConvertCells(request.InputBytes),
            ".ppt" or ".pptx"                     => ConvertSlides(request.InputBytes),
            _ => throw new NotSupportedException($"Aspose does not support extension '{ext}'.")
        };

        var finishedAt = DateTimeOffset.UtcNow;

        var report = new ConversionReport(
            CorrelationId: correlationId,
            RequestedFileName: request.OriginalFileName,
            RequestedExtension: request.Extension,
            RequestedContentType: request.ContentType,
            StartedAt: startedAt,
            FinishedAt: finishedAt,
            DurationMs: (long)(finishedAt - startedAt).TotalMilliseconds,
            InputBytes: request.InputBytes.LongLength,
            InputSha256: Hashing.Sha256Hex(request.InputBytes),
            OutputBytes: pdfBytes.LongLength,
            OutputSha256: Hashing.Sha256Hex(pdfBytes),
            Status: "Success",
            SuccessfulConverter: Name,
            Attempts: new List<ConverterAttempt>
            {
                new(
                    ConverterName: Name,
                    StartedAt: startedAt,
                    FinishedAt: finishedAt,
                    DurationMs: (long)(finishedAt - startedAt).TotalMilliseconds,
                    Status: "Success"
                )
            },
            Steps: new List<ConversionStep>
            {
                new(DateTimeOffset.UtcNow, "Converted", new Dictionary<string,string>
                {
                    ["converter"] = Name,
                    ["ext"] = ext
                })
            },
            Tags: request.Tags
        );

        return Task.FromResult(new ConversionResult(pdfBytes, report));
    }

    private static byte[] ConvertWords(byte[] input)
    {
        using var inMs = new MemoryStream(input);
        var doc = new Document(inMs);

        using var outMs = new MemoryStream();
        doc.Save(outMs, Aspose.Words.SaveFormat.Pdf);
        return outMs.ToArray();
    }

    private static byte[] ConvertCells(byte[] input)
    {
        using var inMs = new MemoryStream(input);
        var wb = new Workbook(inMs);

        using var outMs = new MemoryStream();
        wb.Save(outMs, Aspose.Cells.SaveFormat.Pdf);
        return outMs.ToArray();
    }

    private static byte[] ConvertSlides(byte[] input)
    {
        using var inMs = new MemoryStream(input);
        using var pres = new Presentation(inMs);

        using var outMs = new MemoryStream();
        pres.Save(outMs, Aspose.Slides.Export.SaveFormat.Pdf);
        return outMs.ToArray();
    }

    private static void EnsureAsposeLicenseLoaded(string? licensePath)
    {
        // Run once per process.
        if (Interlocked.Exchange(ref _licenseAttempted, 1) == 1)
            return;

        if (string.IsNullOrWhiteSpace(licensePath))
            return;

        var fullPath = licensePath!;
        if (!Path.IsPathRooted(fullPath))
            fullPath = Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, fullPath));

        if (!File.Exists(fullPath))
            return; // evaluation mode

        try
        {
            new Aspose.Words.License().SetLicense(fullPath);
            new Aspose.Cells.License().SetLicense(fullPath);
            new Aspose.Slides.License().SetLicense(fullPath);
        }
        catch
        {
            // stay in evaluation mode (library stays silent)
        }
    }

    private static string? NormalizeExtension(string? extension, string originalFileName)
    {
        var ext = extension;

        if (string.IsNullOrWhiteSpace(ext))
            ext = Path.GetExtension(originalFileName);

        if (string.IsNullOrWhiteSpace(ext))
            return null;

        if (!ext.StartsWith('.'))
            ext = "." + ext;

        return ext.ToLowerInvariant();
    }
}
