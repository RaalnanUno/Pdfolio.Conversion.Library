namespace Pdfolio.Conversion.Models;

public sealed record ConverterAttempt(
    string ConverterName,
    DateTimeOffset StartedAt,
    DateTimeOffset FinishedAt,
    long DurationMs,
    string Status,              // Success | Failed | Missing
    string? ErrorType = null,
    string? ErrorMessage = null
);
