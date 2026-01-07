namespace Pdfolio.Conversion.Exceptions;

public sealed class ConverterMissingException : Exception
{
    public ConverterMissingException(string message, Exception? inner = null)
        : base(message, inner) { }
}
