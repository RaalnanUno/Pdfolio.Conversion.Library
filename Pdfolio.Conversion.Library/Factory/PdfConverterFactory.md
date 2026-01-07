using Pdfolio.Conversion.Abstractions;
using Pdfolio.Conversion.Converters;
using Pdfolio.Conversion.Locators;

namespace Pdfolio.Conversion.Factory;

public static class PdfConverterFactory
{
    public sealed record OfficeBinaryOptions(
        string? SofficePath = null,
        string? FallbackSofficePath = null
    );

    public sealed record AsposeOptions(
        string? LicensePath = null
    );

    public sealed record PdfConverterFactoryOptions(
        string TempPath,
        int TimeoutSeconds = 60,
        string Mode = "Auto", // Auto | Aspose | LibreOffice | OpenOffice
        AsposeOptions? Aspose = null,
        OfficeBinaryOptions? LibreOffice = null,
        OfficeBinaryOptions? OpenOffice = null,
        bool KeepTempOnFailure = false
    );

    public static IPdfConverter Create(PdfConverterFactoryOptions options)
    {
        if (options is null) throw new ArgumentNullException(nameof(options));
        if (string.IsNullOrWhiteSpace(options.TempPath)) throw new ArgumentException("TempPath is required.");

        var mode = (options.Mode ?? "Auto").Trim().ToLowerInvariant();

        return mode switch
        {
            "auto" or "default" => CreateAuto(options),
            "aspose"            => CreateAspose(options),
            "libreoffice" or "lo" => CreateLibreOffice(options),
            "openoffice"  or "oo" => CreateOpenOffice(options),
            _ => throw new InvalidOperationException($"Unknown Mode '{options.Mode}'. Use Auto, Aspose, LibreOffice, OpenOffice.")
        };
    }

    private static IPdfConverter CreateAuto(PdfConverterFactoryOptions options)
    {
        // Aspose -> LibreOffice -> OpenOffice
        return new ChainPdfConverter(
            CreateAspose(options),
            CreateLibreOffice(options),
            CreateOpenOffice(options)
        );
    }

    private static IPdfConverter CreateAspose(PdfConverterFactoryOptions options)
    {
        var licensePath = options.Aspose?.LicensePath;
        return new AsposePdfConverter(licensePath);
    }

    private static IPdfConverter CreateLibreOffice(PdfConverterFactoryOptions options)
    {
        var primarySoffice = ResolveLibreOfficeSofficePath(options.LibreOffice?.SofficePath);
        var fallbackSoffice = ToFullPathOrNull(options.LibreOffice?.FallbackSofficePath);

        var primary = new LibreOfficeHeadlessPdfConverter(new LibreOfficeHeadlessPdfConverter.Options(
            TempPath: ToFullPath(options.TempPath),
            SofficePath: primarySoffice,
            TimeoutSeconds: options.TimeoutSeconds,
            KeepTempOnFailure: options.KeepTempOnFailure
        ));

        IPdfConverter? fallback = null;
        if (!string.IsNullOrWhiteSpace(fallbackSoffice))
        {
            fallback = new LibreOfficeHeadlessPdfConverter(new LibreOfficeHeadlessPdfConverter.Options(
                TempPath: ToFullPath(options.TempPath),
                SofficePath: fallbackSoffice!,
                TimeoutSeconds: options.TimeoutSeconds,
                KeepTempOnFailure: options.KeepTempOnFailure
            ));
        }

        return new MissingBinaryGuardConverter(new FallbackPdfConverter(primary, fallback));
    }

    private static IPdfConverter CreateOpenOffice(PdfConverterFactoryOptions options)
    {
        var primarySoffice = ResolveOpenOfficeSofficePath(options.OpenOffice?.SofficePath);
        var fallbackSoffice = ToFullPathOrNull(options.OpenOffice?.FallbackSofficePath);

        var primary = new OpenOfficeHeadlessPdfConverter(new OpenOfficeHeadlessPdfConverter.Options(
            TempPath: ToFullPath(options.TempPath),
            SofficePath: primarySoffice,
            TimeoutSeconds: options.TimeoutSeconds,
            KeepTempOnFailure: options.KeepTempOnFailure
        ));

        IPdfConverter? fallback = null;
        if (!string.IsNullOrWhiteSpace(fallbackSoffice))
        {
            fallback = new OpenOfficeHeadlessPdfConverter(new OpenOfficeHeadlessPdfConverter.Options(
                TempPath: ToFullPath(options.TempPath),
                SofficePath: fallbackSoffice!,
                TimeoutSeconds: options.TimeoutSeconds,
                KeepTempOnFailure: options.KeepTempOnFailure
            ));
        }

        return new MissingBinaryGuardConverter(new FallbackPdfConverter(primary, fallback));
    }

    private static string ResolveLibreOfficeSofficePath(string? configured)
    {
        if (!string.IsNullOrWhiteSpace(configured))
            return ToFullPath(configured);

        var discovered = LibreOfficeLocator.FindSofficeExe();
        if (!string.IsNullOrWhiteSpace(discovered))
            return discovered;

        return "soffice.exe";
    }

    private static string ResolveOpenOfficeSofficePath(string? configured)
    {
        if (!string.IsNullOrWhiteSpace(configured))
            return ToFullPath(configured);

        var discovered = OpenOfficeLocator.FindSofficeExe();
        if (!string.IsNullOrWhiteSpace(discovered))
            return discovered;

        return "soffice.exe";
    }

    private static string ToFullPath(string path)
    {
        if (Path.IsPathRooted(path))
            return path;

        return Path.GetFullPath(Path.Combine(AppContext.BaseDirectory, path));
    }

    private static string? ToFullPathOrNull(string? path)
        => string.IsNullOrWhiteSpace(path) ? null : ToFullPath(path);
}
