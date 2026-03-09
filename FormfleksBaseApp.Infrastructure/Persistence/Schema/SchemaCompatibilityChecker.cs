using System.Data;
using System.Data.Common;
using FormfleksBaseApp.Infrastructure.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;

namespace FormfleksBaseApp.Infrastructure.Persistence.Schema;

[Obsolete("Bu servis Q3 refactor planında kaldırılacaktır. Yerine EF Core built-in migration API'leri kullanınız.", true)]
public sealed class SchemaCompatibilityChecker : ISchemaCompatibilityChecker
{
    private readonly AppDbContext _dbContext;
    private readonly SchemaCompatibilityOptions _options;
    private readonly ILogger<SchemaCompatibilityChecker> _logger;

    public SchemaCompatibilityChecker(
        AppDbContext dbContext,
        IOptions<SchemaCompatibilityOptions> options,
        ILogger<SchemaCompatibilityChecker> logger)
    {
        _dbContext = dbContext;
        _options = options.Value;
        _logger = logger;
    }

    public Task ValidateAsync(CancellationToken ct)
    {
        // QUARANTINE: YYYY-MM-DD
        // This class is marked obsolete and its logic has been neutralized to prevent unintended DB blocking.
        return Task.CompletedTask;
    }

    private static async Task EnsureTable(NpgsqlConnection conn, string table, ICollection<string> issues, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.tables
                WHERE table_schema = current_schema()
                  AND table_name = @table
            )
            """,
            conn);
        cmd.Parameters.AddWithValue("table", table);

        if (!await ExecuteExists(cmd, ct))
            issues.Add($"Missing table: {table}");
    }

    private static async Task EnsureColumn(NpgsqlConnection conn, string table, string column, ICollection<string> issues, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT EXISTS (
                SELECT 1
                FROM information_schema.columns
                WHERE table_schema = current_schema()
                  AND table_name = @table
                  AND column_name = @column
            )
            """,
            conn);
        cmd.Parameters.AddWithValue("table", table);
        cmd.Parameters.AddWithValue("column", column);

        if (!await ExecuteExists(cmd, ct))
            issues.Add($"Missing column: {table}.{column}");
    }

    private static async Task EnsureUniqueIndex(NpgsqlConnection conn, string table, string indexedColumns, ICollection<string> issues, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT EXISTS (
                SELECT 1
                FROM pg_indexes
                WHERE schemaname = current_schema()
                  AND tablename = @table
                  AND indexdef LIKE 'CREATE UNIQUE INDEX%'
                  AND indexdef ILIKE @indexedColumns
            )
            """,
            conn);
        cmd.Parameters.AddWithValue("table", table);
        cmd.Parameters.AddWithValue("indexedColumns", $"%{indexedColumns}%");

        if (!await ExecuteExists(cmd, ct))
            issues.Add($"Missing unique index on {table}{indexedColumns}");
    }

    private static async Task EnsureExpectedVersion(NpgsqlConnection conn, string expectedVersion, ICollection<string> issues, CancellationToken ct)
    {
        await using var cmd = new NpgsqlCommand(
            """
            SELECT EXISTS (
                SELECT 1
                FROM schema_version
                WHERE version = @version
            )
            """,
            conn);
        cmd.Parameters.AddWithValue("version", expectedVersion);

        if (!await ExecuteExists(cmd, ct))
            issues.Add($"schema_version does not contain expected version: {expectedVersion}");
    }

    private static async Task<bool> ExecuteExists(DbCommand command, CancellationToken ct)
    {
        var result = await command.ExecuteScalarAsync(ct);
        return result is true || (result is bool boolResult && boolResult);
    }
}
