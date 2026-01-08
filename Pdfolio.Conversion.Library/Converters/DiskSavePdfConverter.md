using Pdfolio.Conversion.Abstractions;
using Pdfolio.Conversion.Models;

namespace Pdfolio.Conversion.Converters;

/// <summary>
/// Decorator that optionally saves the produced PDF next to the original file.
/// Never throws due to disk save failures; instead, records a ConversionStep.
/// </summary>
public sealed class DiskSavePdfConverter : IPdfConverter
{
    private readonly IPdfConverter _inner;

    public DiskSavePdfConverter(IPdfConverter inner)
        => _inner = inner ?? throw new ArgumentNullException(nameof(inner));

    public string Name => _inner.Name;

    public async Task<ConversionResult> ConvertToPdfAsync(ConversionRequest request, CancellationToken ct = default)
    {
        var result = await _inner.ConvertToPdfAsync(request, ct);

        if (!request.SavePdfNextToOriginal)
            return result;

        var steps = (result.Report.Steps ?? new List<ConversionStep>()).ToList();

        try
        {
            if (string.IsNullOrWhiteSpace(request.OriginalFullPath))
            {
                steps.Add(new ConversionStep(
                    DateTimeOffset.UtcNow,
                    "SavedPdfToDisk",
                    new Dictionary<string, string>
                    {
                        ["status"] = "Skipped",
                        ["reason"] = "OriginalFullPath was not provided"
                    }
                ));

                return result with { Report = result.Report with { Steps = steps } };
            }

            var dir = Path.GetDirectoryName(request.OriginalFullPath);
            if (string.IsNullOrWhiteSpace(dir))
            {
                steps.Add(new ConversionStep(
                    DateTimeOffset.UtcNow,
                    "SavedPdfToDisk",
                    new Dictionary<string, string>
                    {
                        ["status"] = "Skipped",
                        ["reason"] = "Could not determine directory from OriginalFullPath"
                    }
                ));

                return result with { Report = result.Report with { Steps = steps } };
            }

            Directory.CreateDirectory(dir);

            var fileName =
                !string.IsNullOrWhiteSpace(request.OutputPdfFileName)
                    ? request.OutputPdfFileName!
                    : Path.GetFileNameWithoutExtension(request.OriginalFileName) + ".pdf";

            var outputPath = Path.Combine(dir, fileName);

            await File.WriteAllBytesAsync(outputPath, result.PdfBytes, ct);

            steps.Add(new ConversionStep(
                DateTimeOffset.UtcNow,
                "SavedPdfToDisk",
                new Dictionary<string, string>
                {
                    ["status"] = "Success",
                    ["path"] = outputPath
                }
            ));
        }
        catch (Exception ex)
        {
            steps.Add(new ConversionStep(
                DateTimeOffset.UtcNow,
                "SavedPdfToDisk",
                new Dictionary<string, string>
                {
                    ["status"] = "Failed",
                    ["errorType"] = ex.GetType().FullName ?? "Exception",
                    ["errorMessage"] = ex.Message
                }
            ));
        }

        return result with { Report = result.Report with { Steps = steps } };
    }
}
