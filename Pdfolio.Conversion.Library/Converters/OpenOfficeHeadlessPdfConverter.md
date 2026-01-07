using System.Diagnostics;
using System.Text;

using Pdfolio.Conversion.Abstractions;
using Pdfolio.Conversion.Models;
using Pdfolio.Conversion.Utility;

namespace Pdfolio.Conversion.Converters;

public sealed class OpenOfficeHeadlessPdfConverter : IPdfConverter
{
    public sealed record Options(
        string TempPath,
        string SofficePath,
        int TimeoutSeconds = 60,
        bool KeepTempOnFailure = true // OO is usually the one you want to inspect on failures
    );

    private readonly Options _options;

    public OpenOfficeHeadlessPdfConverter(Options options)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
    }

    public string Name => "OpenOffice";

    public async Task<ConversionResult> ConvertToPdfAsync(ConversionRequest request, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        if (request.InputBytes is null || request.InputBytes.Length == 0)
            throw new ArgumentException("Input file is empty.", nameof(request.InputBytes));

        var correlationId = string.IsNullOrWhiteSpace(request.CorrelationId)
            ? Guid.NewGuid().ToString("N")
            : request.CorrelationId!;

        var startedAt = DateTimeOffset.UtcNow;

        Directory.CreateDirectory(_options.TempPath);

        var workDir = Path.Combine(_options.TempPath, Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(workDir);

        var ext = NormalizeExtension(request.Extension, request.OriginalFileName) ?? ".bin";
        var inputPath = Path.Combine(workDir, "input" + ext);

        // isolated profile avoids lock/first-run UI
        var profileDir = Path.Combine(workDir, "oo-profile");
        Directory.CreateDirectory(profileDir);
        var userInstall = ToFileUriWithTrailingSlash(profileDir);

        // Prefer soffice.com when configured exe is soffice.exe
        var soffice = PreferSofficeCom(_options.SofficePath);

        string? producedPdfPath = null;

        try
        {
            await File.WriteAllBytesAsync(inputPath, request.InputBytes, ct);

            var expectedPdfPath = Path.Combine(workDir, "input.pdf");

            var args =
                $"-headless -invisible -nologo -nofirststartwizard -norestore -nodefault -nolockcheck -nocrashreport " +
                $"-env:UserInstallation={userInstall} " +
                $"-convert-to pdf -outdir \"{workDir}\" \"{inputPath}\"";

            var (exitCode, stdout, stderr) = await RunProcessAsync(
                fileName: soffice,
                arguments: args,
                workingDirectory: workDir,
                timeout: TimeSpan.FromSeconds(_options.TimeoutSeconds),
                ct: ct
            );

            if (exitCode != 0)
            {
                throw new InvalidOperationException(
                    $"OpenOffice conversion failed (exit {exitCode}).\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}");
            }

            // launcher can exit before disk write; poll briefly
            producedPdfPath = await WaitForProducedPdfAsync(workDir, expectedPdfPath, maxWaitMs: 8000, ct);

            if (producedPdfPath is null)
            {
                var listing = SafeDirectoryListing(workDir);
                throw new FileNotFoundException(
                    "OpenOffice reported success but produced no PDF.\n" +
                    $"WorkDir: {workDir}\nFiles:\n{listing}\n"
                );
            }

            var pdfBytes = await File.ReadAllBytesAsync(producedPdfPath, ct);

            var finishedAt = DateTimeOffset.UtcNow;

            var report = new ConversionReport(
                CorrelationId: correlationId,
                RequestedFileName: request.OriginalFileName,
                RequestedExtension: request.Extension,
                RequestedContentType: request.ContentType,
                StartedAt: startedAt,
                FinishedAt: finishedAt,
                DurationMs: (long)(finishedAt - startedAt).TotalMilliseconds,
                InputBytes: request.InputBytes.LongLength,
                InputSha256: Hashing.Sha256Hex(request.InputBytes),
                OutputBytes: pdfBytes.LongLength,
                OutputSha256: Hashing.Sha256Hex(pdfBytes),
                Status: "Success",
                SuccessfulConverter: Name,
                Attempts: new List<ConverterAttempt>
                {
                    new(Name, startedAt, finishedAt, (long)(finishedAt - startedAt).TotalMilliseconds, "Success")
                },
                Steps: new List<ConversionStep>
                {
                    new(DateTimeOffset.UtcNow, "Converted", new Dictionary<string,string>
                    {
                        ["converter"] = Name,
                        ["ext"] = ext
                    })
                },
                Tags: request.Tags
            );

            return new ConversionResult(pdfBytes, report);
        }
        finally
        {
            if (_options.KeepTempOnFailure)
            {
                // Keep folder for inspection on failures.
                // No cleanup here.
            }
            else
            {
                // If KeepTempOnFailure is false, cleanup always.
                try { Directory.Delete(workDir, recursive: true); } catch { /* ignore */ }
            }
        }

    }

    private static string PreferSofficeCom(string sofficePath)
    {
        try
        {
            if (sofficePath.EndsWith("soffice.exe", StringComparison.OrdinalIgnoreCase))
            {
                var com = sofficePath[..^4] + "com"; // .exe -> .com
                if (File.Exists(com)) return com;
            }

            if (string.Equals(sofficePath, "soffice.exe", StringComparison.OrdinalIgnoreCase))
                return "soffice.com";
        }
        catch { /* ignore */ }

        return sofficePath;
    }

    private static async Task<string?> WaitForProducedPdfAsync(string workDir, string expectedPdfPath, int maxWaitMs, CancellationToken ct)
    {
        var sw = Stopwatch.StartNew();

        while (sw.ElapsedMilliseconds < maxWaitMs)
        {
            ct.ThrowIfCancellationRequested();

            if (File.Exists(expectedPdfPath))
                return expectedPdfPath;

            var pdf = Directory.EnumerateFiles(workDir, "*.pdf", SearchOption.TopDirectoryOnly)
                .OrderByDescending(File.GetLastWriteTimeUtc)
                .FirstOrDefault();

            if (pdf is not null)
                return pdf;

            await Task.Delay(250, ct);
        }

        return null;
    }

    private static string SafeDirectoryListing(string dir)
    {
        try
        {
            var files = Directory.EnumerateFiles(dir, "*", SearchOption.AllDirectories)
                .Select(p => p.Substring(dir.Length).TrimStart(Path.DirectorySeparatorChar))
                .OrderBy(p => p, StringComparer.OrdinalIgnoreCase);

            return string.Join(Environment.NewLine, files);
        }
        catch (Exception ex)
        {
            return "(Failed to list directory: " + ex.Message + ")";
        }
    }

    private static string? NormalizeExtension(string? extension, string originalFileName)
    {
        var ext = extension;

        if (string.IsNullOrWhiteSpace(ext))
            ext = Path.GetExtension(originalFileName);

        if (string.IsNullOrWhiteSpace(ext))
            return null;

        if (!ext.StartsWith('.'))
            ext = "." + ext;

        return ext.ToLowerInvariant();
    }

    private static string ToFileUriWithTrailingSlash(string path)
    {
        var full = Path.GetFullPath(path);

        var uri = new Uri(full.EndsWith(Path.DirectorySeparatorChar)
            ? full
            : full + Path.DirectorySeparatorChar);

        return uri.AbsoluteUri;
    }

    private static async Task<(int ExitCode, string StdOut, string StdErr)> RunProcessAsync(
        string fileName,
        string arguments,
        string workingDirectory,
        TimeSpan timeout,
        CancellationToken ct)
    {
        var psi = new ProcessStartInfo
        {
            FileName = fileName,
            Arguments = arguments,
            WorkingDirectory = workingDirectory,
            RedirectStandardOutput = true,
            RedirectStandardError = true,
            UseShellExecute = false,
            CreateNoWindow = true
        };

        using var proc = new Process { StartInfo = psi };

        var stdout = new StringBuilder();
        var stderr = new StringBuilder();

        proc.OutputDataReceived += (_, e) => { if (e.Data != null) stdout.AppendLine(e.Data); };
        proc.ErrorDataReceived += (_, e) => { if (e.Data != null) stderr.AppendLine(e.Data); };

        if (!proc.Start())
            throw new InvalidOperationException("Failed to start OpenOffice process.");

        proc.BeginOutputReadLine();
        proc.BeginErrorReadLine();

        var completed = await Task.Run(() => proc.WaitForExit((int)timeout.TotalMilliseconds), ct);
        if (!completed)
        {
            try { proc.Kill(entireProcessTree: true); } catch { /* ignore */ }
            throw new TimeoutException($"OpenOffice conversion timed out after {timeout.TotalSeconds} seconds.");
        }

        return (proc.ExitCode, stdout.ToString(), stderr.ToString());
    }
}
