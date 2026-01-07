using System.Diagnostics;
using Pdfolio.Conversion.Abstractions;
using Pdfolio.Conversion.Exceptions;
using Pdfolio.Conversion.Models;
using Pdfolio.Conversion.Utility;

namespace Pdfolio.Conversion.Converters;

public sealed class ChainPdfConverter : IPdfConverter
{
    private readonly IReadOnlyList<IPdfConverter> _converters;

    public ChainPdfConverter(params IPdfConverter[] converters)
    {
        _converters = converters?.Where(c => c != null).ToList()
            ?? throw new ArgumentNullException(nameof(converters));

        if (_converters.Count == 0)
            throw new ArgumentException("At least one converter is required.");
    }

    public string Name => "Chain";

    public async Task<ConversionResult> ConvertToPdfAsync(
        ConversionRequest request,
        CancellationToken ct = default)
    {
        var correlationId = string.IsNullOrWhiteSpace(request.CorrelationId)
            ? Guid.NewGuid().ToString("N")
            : request.CorrelationId!;

        var startedAt = DateTimeOffset.UtcNow;
        var swAll = Stopwatch.StartNew();

        var attempts = new List<ConverterAttempt>();
        var steps = new List<ConversionStep>();
        var inputSha = Hashing.Sha256Hex(request.InputBytes);

        Exception? last = null;

        foreach (var converter in _converters)
        {
            var aStart = DateTimeOffset.UtcNow;
            var sw = Stopwatch.StartNew();

            try
            {
                steps.Add(new ConversionStep(
                    DateTimeOffset.UtcNow,
                    "Attempt",
                    new() { ["converter"] = converter.Name }
                ));

                var result = await converter.ConvertToPdfAsync(request, ct);

                sw.Stop();
                var aEnd = DateTimeOffset.UtcNow;

                attempts.Add(new ConverterAttempt(
                    converter.Name,
                    aStart,
                    aEnd,
                    sw.ElapsedMilliseconds,
                    "Success"
                ));

                swAll.Stop();
                var finishedAt = DateTimeOffset.UtcNow;

                var outputSha = Hashing.Sha256Hex(result.PdfBytes);

                var report = new ConversionReport(
                    correlationId,
                    request.OriginalFileName,
                    request.Extension,
                    request.ContentType,
                    startedAt,
                    finishedAt,
                    swAll.ElapsedMilliseconds,
                    request.InputBytes.LongLength,
                    inputSha,
                    result.PdfBytes.LongLength,
                    outputSha,
                    "Success",
                    converter.Name,
                    attempts,
                    steps,
                    request.Tags
                );

                return new ConversionResult(result.PdfBytes, report);
            }
            catch (Exception ex)
            {
                sw.Stop();
                var aEnd = DateTimeOffset.UtcNow;

                attempts.Add(new ConverterAttempt(
                    converter.Name,
                    aStart,
                    aEnd,
                    sw.ElapsedMilliseconds,
                    ex is ConverterMissingException ? "Missing" : "Failed",
                    ex.GetType().FullName,
                    ex.Message
                ));

                last = ex;
            }
        }

        swAll.Stop();
        var failAt = DateTimeOffset.UtcNow;

        var failReport = new ConversionReport(
            correlationId,
            request.OriginalFileName,
            request.Extension,
            request.ContentType,
            startedAt,
            failAt,
            swAll.ElapsedMilliseconds,
            request.InputBytes.LongLength,
            inputSha,
            0,
            "",
            "Failed",
            null,
            attempts,
            steps,
            request.Tags,
            last?.GetType().FullName,
            last?.Message
        );

        throw new PdfConversionFailedException(failReport, last);
    }
}
