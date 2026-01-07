using Pdfolio.Conversion.Abstractions;
using Pdfolio.Conversion.Exceptions;
using Pdfolio.Conversion.Models;

namespace Pdfolio.Conversion.Converters;

public sealed class MissingBinaryGuardConverter : IPdfConverter
{
    private readonly IPdfConverter _inner;

    public MissingBinaryGuardConverter(IPdfConverter inner) => _inner = inner;

    public string Name => _inner.Name;

    public async Task<ConversionResult> ConvertToPdfAsync(ConversionRequest request, CancellationToken ct = default)
    {
        try
        {
            return await _inner.ConvertToPdfAsync(request, ct);
        }
        catch (Exception ex) when (LooksLikeMissingSoffice(ex))
        {
            throw new ConverterMissingException("LibreOffice/OpenOffice (soffice) is missing or not runnable.", ex);
        }
    }

    private static bool LooksLikeMissingSoffice(Exception ex)
    {
        var msg = ex.ToString();

        return msg.Contains("soffice", StringComparison.OrdinalIgnoreCase) &&
               (
                   msg.Contains("cannot find the file", StringComparison.OrdinalIgnoreCase) ||
                   msg.Contains("The system cannot find the file", StringComparison.OrdinalIgnoreCase) ||
                   msg.Contains("Win32Exception", StringComparison.OrdinalIgnoreCase) ||
                   msg.Contains("is not recognized", StringComparison.OrdinalIgnoreCase)
               );
    }
}
