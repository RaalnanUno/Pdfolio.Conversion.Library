namespace Pdfolio.Conversion.Models;

public sealed record ConversionStep(
    DateTimeOffset At,
    string Name,
    Dictionary<string, string>? Data = null
);
