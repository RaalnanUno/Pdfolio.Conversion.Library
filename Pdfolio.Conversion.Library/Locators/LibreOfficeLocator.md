using Microsoft.Win32;

namespace Pdfolio.Conversion.Locators;

public static class LibreOfficeLocator
{
    public static string? FindSofficeExe()
    {
        // 1) Env var override
        var env = Environment.GetEnvironmentVariable("SOFFICE_PATH");
        if (!string.IsNullOrWhiteSpace(env) && File.Exists(env))
            return env;

        // 2) Common install locations
        var candidates = new[]
        {
            @"C:\Program Files\LibreOffice\program\soffice.exe",
            @"C:\Program Files (x86)\LibreOffice\program\soffice.exe"
        };

        foreach (var c in candidates)
            if (File.Exists(c)) return c;

        // 3) Registry (best effort)
        // 3) Try registry (Windows)
        try
        {
            if (!OperatingSystem.IsWindows())
                return null;

            using var key = Microsoft.Win32.Registry.LocalMachine.OpenSubKey(@"SOFTWARE\LibreOffice\LibreOffice");
            var installPath = key?.GetValue("InstallPath") as string;
            if (!string.IsNullOrWhiteSpace(installPath))
            {
                var exe = Path.Combine(installPath, "program", "soffice.exe");
                if (File.Exists(exe)) return exe;
            }
        }
        catch
        {
            // ignore
        }


        return null;
    }
}
