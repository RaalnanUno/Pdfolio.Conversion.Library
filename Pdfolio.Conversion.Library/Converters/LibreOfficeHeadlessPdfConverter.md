using System.Diagnostics;
using System.Text;

using Pdfolio.Conversion.Abstractions;
using Pdfolio.Conversion.Models;
using Pdfolio.Conversion.Utility;

namespace Pdfolio.Conversion.Converters;

public sealed class LibreOfficeHeadlessPdfConverter : IPdfConverter
{
    public sealed record Options(
        string TempPath,
        string SofficePath,
        int TimeoutSeconds = 60,
        bool KeepTempOnFailure = false
    );

    private readonly Options _options;

    public LibreOfficeHeadlessPdfConverter(Options options)
    {
        _options = options ?? throw new ArgumentNullException(nameof(options));
    }

    public string Name => "LibreOffice";

    public async Task<ConversionResult> ConvertToPdfAsync(ConversionRequest request, CancellationToken ct = default)
    {
        ct.ThrowIfCancellationRequested();

        var correlationId = string.IsNullOrWhiteSpace(request.CorrelationId)
            ? Guid.NewGuid().ToString("N")
            : request.CorrelationId!;

        var startedAt = DateTimeOffset.UtcNow;

        Directory.CreateDirectory(_options.TempPath);

        var workDir = Path.Combine(_options.TempPath, Guid.NewGuid().ToString("N"));
        Directory.CreateDirectory(workDir);

        var ext = NormalizeExtension(request.Extension, request.OriginalFileName) ?? ".bin";
        var inputPath = Path.Combine(workDir, "input" + ext);

        string? expectedPdfPath = Path.Combine(workDir, "input.pdf");

        try
        {
            await File.WriteAllBytesAsync(inputPath, request.InputBytes, ct);

            var args =
                $"--headless --nologo --nofirststartwizard --norestore " +
                $"--convert-to pdf --outdir \"{workDir}\" \"{inputPath}\"";

            var (exitCode, stdout, stderr) = await RunProcessAsync(
                fileName: _options.SofficePath,
                arguments: args,
                workingDirectory: workDir,
                timeout: TimeSpan.FromSeconds(_options.TimeoutSeconds),
                ct: ct
            );

            if (exitCode != 0)
            {
                throw new InvalidOperationException(
                    $"LibreOffice conversion failed (exit {exitCode}).\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}");
            }

            if (!File.Exists(expectedPdfPath))
            {
                var pdf = Directory.EnumerateFiles(workDir, "*.pdf", SearchOption.TopDirectoryOnly)
                    .OrderByDescending(File.GetLastWriteTimeUtc)
                    .FirstOrDefault();

                if (pdf is null)
                    throw new FileNotFoundException(
                        $"LibreOffice reported success but no PDF was produced.\nSTDOUT:\n{stdout}\nSTDERR:\n{stderr}");

                expectedPdfPath = pdf;
            }

            var pdfBytes = await File.ReadAllBytesAsync(expectedPdfPath, ct);

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
                // Keep folder for inspection; do not delete.
                // (No 'return' allowed in finally.)
            }
            else
            {
                // Best-effort cleanup. Do not throw if cleanup fails.
                try { Directory.Delete(workDir, recursive: true); } catch { /* ignore */ }
            }
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
            throw new InvalidOperationException("Failed to start LibreOffice process.");

        proc.BeginOutputReadLine();
        proc.BeginErrorReadLine();

        var completed = await Task.Run(() => proc.WaitForExit((int)timeout.TotalMilliseconds), ct);
        if (!completed)
        {
            try { proc.Kill(entireProcessTree: true); } catch { /* ignore */ }
            throw new TimeoutException($"LibreOffice conversion timed out after {timeout.TotalSeconds} seconds.");
        }

        return (proc.ExitCode, stdout.ToString(), stderr.ToString());
    }
}
