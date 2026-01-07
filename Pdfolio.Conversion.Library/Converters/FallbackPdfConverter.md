using Pdfolio.Conversion.Abstractions;
using Pdfolio.Conversion.Models;

namespace Pdfolio.Conversion.Converters;

public sealed class FallbackPdfConverter : IPdfConverter
{
    private readonly IPdfConverter _primary;
    private readonly IPdfConverter? _fallback;

    public FallbackPdfConverter(IPdfConverter primary, IPdfConverter? fallback)
    {
        _primary = primary;
        _fallback = fallback;
    }

    public string Name => $"{_primary.Name}+Fallback";

    public async Task<ConversionResult> ConvertToPdfAsync(
        ConversionRequest request,
        CancellationToken ct = default)
    {
        try
        {
            return await _primary.ConvertToPdfAsync(request, ct);
        }
        catch when (_fallback != null)
        {
            return await _fallback.ConvertToPdfAsync(request, ct);
        }
    }
}
