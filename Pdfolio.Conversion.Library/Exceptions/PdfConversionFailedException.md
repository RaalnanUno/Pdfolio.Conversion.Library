using Pdfolio.Conversion.Models;

namespace Pdfolio.Conversion.Exceptions;

public sealed class PdfConversionFailedException : Exception
{
    public ConversionReport Report { get; }

    public PdfConversionFailedException(ConversionReport report, Exception? inner = null)
        : base("PDF conversion failed.", inner)
    {
        Report = report ?? throw new ArgumentNullException(nameof(report));
    }
}
