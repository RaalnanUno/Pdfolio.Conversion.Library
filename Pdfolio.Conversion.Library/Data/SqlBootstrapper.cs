using System.Reflection;
using System.Text;
using Microsoft.Data.Sqlite;

namespace Pdfolio.Conversion.Library.Data;

public static class SqlBootstrapper
{
    public static async Task EnsureDatabaseAndMigrateAsync(string connectionString)
    {
        await RunEmbeddedMigrationsAsync(connectionString);
    }

    private static async Task RunEmbeddedMigrationsAsync(string connString)
    {
        // Ensure migrations table exists first
        await RunEmbeddedScriptAsync(connString, "Sql.001_SchemaMigrations.sql");

        var assembly = Assembly.GetExecutingAssembly();

        // All embedded scripts under Sql/ excluding the migrations table script
        var scripts = assembly.GetManifestResourceNames()
            .Where(n => n.Contains(".Sql.", StringComparison.OrdinalIgnoreCase) &&
                        n.EndsWith(".sql", StringComparison.OrdinalIgnoreCase))
            .Where(n => n.EndsWith("Sql.001_SchemaMigrations.sql", StringComparison.OrdinalIgnoreCase) == false)
            .OrderBy(n => n, StringComparer.OrdinalIgnoreCase)
            .ToList();

        foreach (var scriptResourceName in scripts)
        {
            var shortName = ResourceToShortFileName(scriptResourceName);

            if (await IsScriptAppliedAsync(connString, shortName))
                continue;

            Console.WriteLine("[SQL] Applying: " + shortName);

            await RunEmbeddedScriptAsync(connString, scriptResourceName);
            await MarkScriptAppliedAsync(connString, shortName);
        }

    }

    private static async Task<bool> IsScriptAppliedAsync(string connString, string scriptName)
    {
        const string sql = @"SELECT 1 FROM SchemaMigrations WHERE ScriptName = $ScriptName LIMIT 1;";
        await using var conn = new SqliteConnection(connString);
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("$ScriptName", scriptName);

        var result = await cmd.ExecuteScalarAsync();
        return result != null;
    }

    private static async Task MarkScriptAppliedAsync(string connString, string scriptName)
    {
        const string sql = @"INSERT INTO SchemaMigrations (ScriptName) VALUES ($ScriptName);";
        await using var conn = new SqliteConnection(connString);
        await conn.OpenAsync();

        await using var cmd = conn.CreateCommand();
        cmd.CommandText = sql;
        cmd.Parameters.AddWithValue("$ScriptName", scriptName);

        await cmd.ExecuteNonQueryAsync();
    }

    private static async Task RunEmbeddedScriptAsync(string connString, string resourceNameOrSuffix)
    {
        var assembly = Assembly.GetExecutingAssembly();

        var match = assembly.GetManifestResourceNames()
            .FirstOrDefault(n => n.Equals(resourceNameOrSuffix, StringComparison.OrdinalIgnoreCase))
            ?? assembly.GetManifestResourceNames()
                .FirstOrDefault(n => n.EndsWith(resourceNameOrSuffix, StringComparison.OrdinalIgnoreCase));

        if (match is null)
        {
            var available = string.Join(Environment.NewLine, assembly.GetManifestResourceNames());
            throw new InvalidOperationException(
                $"Embedded SQL resource not found: {resourceNameOrSuffix}{Environment.NewLine}" +
                $"Available resources:{Environment.NewLine}{available}");
        }

        await using var stream = assembly.GetManifestResourceStream(match)
            ?? throw new InvalidOperationException($"Embedded SQL resource stream not found: {match}");

        using var reader = new StreamReader(stream, Encoding.UTF8);
        var sqlText = await reader.ReadToEndAsync();

        var batches = SplitOnSemicolon(sqlText);

        await using var conn = new SqliteConnection(connString);
        await conn.OpenAsync();

        foreach (var batch in batches)
        {
            var trimmed = batch.Trim();
            if (string.IsNullOrWhiteSpace(trimmed)) continue;

            await using var cmd = conn.CreateCommand();
            cmd.CommandText = trimmed;
            cmd.CommandTimeout = 60;
            await cmd.ExecuteNonQueryAsync();
        }
    }

    private static List<string> SplitOnSemicolon(string sql)
    {
        // Simple splitter: OK for DDL-only scripts.
        return sql.Split(';')
            .Select(s => s.Trim())
            .Where(s => !string.IsNullOrWhiteSpace(s))
            .Select(s => s + ";")
            .ToList();
    }

    private static string ResourceToShortFileName(string resourceName)
    {
        var lastDotSql = resourceName.LastIndexOf(".Sql.", StringComparison.OrdinalIgnoreCase);
        if (lastDotSql < 0) return resourceName;

        return resourceName[(lastDotSql + ".Sql.".Length)..];
    }
}
