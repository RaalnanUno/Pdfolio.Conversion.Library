namespace Pdfolio.Conversion.Models;

public sealed record ConversionRequest(
    byte[] InputBytes,
    string OriginalFileName,
    string? Extension = null,
    string? ContentType = null,
    string? CorrelationId = null,
    Dictionary<string, string>? Tags = null,

    // NEW: where the original came from (so we can save beside it)
    string? OriginalFullPath = null,

    // NEW: opt-in behavior
    bool SavePdfNextToOriginal = false,

    // NEW: optional override for saved PDF name
    string? OutputPdfFileName = null
);
