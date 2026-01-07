using Pdfolio.Conversion.Models;

namespace Pdfolio.Conversion.Abstractions;

public interface IPdfConverter
{
    string Name { get; }
    Task<ConversionResult> ConvertToPdfAsync(
        ConversionRequest request,
        CancellationToken ct = default
    );
}
