namespace Pdfolio.Conversion.Models;

public sealed record ConversionRequest(
    byte[] InputBytes,
    string OriginalFileName,
    string? Extension = null,
    string? ContentType = null,
    string? CorrelationId = null,
    Dictionary<string, string>? Tags = null
);
