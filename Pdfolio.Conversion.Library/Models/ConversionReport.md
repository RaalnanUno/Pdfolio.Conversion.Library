namespace Pdfolio.Conversion.Models;

public sealed record ConversionReport(
    string CorrelationId,
    string RequestedFileName,
    string? RequestedExtension,
    string? RequestedContentType,
    DateTimeOffset StartedAt,
    DateTimeOffset FinishedAt,
    long DurationMs,
    long InputBytes,
    string InputSha256,
    long OutputBytes,
    string OutputSha256,
    string Status,                         // Success | Failed
    string? SuccessfulConverter = null,
    List<ConverterAttempt>? Attempts = null,
    List<ConversionStep>? Steps = null,
    Dictionary<string, string>? Tags = null,
    string? ErrorType = null,
    string? ErrorMessage = null
);
