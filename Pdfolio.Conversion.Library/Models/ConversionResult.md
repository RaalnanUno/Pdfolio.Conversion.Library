namespace Pdfolio.Conversion.Models;

public sealed record ConversionResult(
    byte[] PdfBytes,
    ConversionReport Report
);
