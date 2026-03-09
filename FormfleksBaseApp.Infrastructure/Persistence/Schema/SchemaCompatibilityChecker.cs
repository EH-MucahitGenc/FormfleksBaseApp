using System.Data;
using System.Data.Common;
using FormfleksBaseApp.Infrastructure.Options;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Npgsql;

namespace FormfleksBaseApp.Infrastructure.Persistence.Schema;

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

    public async Task ValidateAsync(CancellationToken ct)
    {
        var issues = new List<string>();

        await using var conn = (NpgsqlConnection)_dbContext.Database.GetDbConnection();
        if (conn.State != ConnectionState.Open)
            await conn.OpenAsync(ct);

        await EnsureTable(conn, "users", issues, ct);
        await EnsureTable(conn, "refresh_tokens", issues, ct);
        await EnsureTable(conn, "schema_version", issues, ct);

        await EnsureColumn(conn, "users", "id", issues, ct);
        await EnsureColumn(conn, "users", "email", issues, ct);
        await EnsureColumn(conn, "users", "auth_provider", issues, ct);
        await EnsureColumn(conn, "users", "external_id", issues, ct);

        await EnsureColumn(conn, "refresh_tokens", "id", issues, ct);
        await EnsureColumn(conn, "refresh_tokens", "user_id", issues, ct);
        await EnsureColumn(conn, "refresh_tokens", "token_hash", issues, ct);
        await EnsureColumn(conn, "refresh_tokens", "expires_at", issues, ct);

        await EnsureColumn(conn, "schema_version", "version", issues, ct);
        await EnsureColumn(conn, "schema_version", "applied_at", issues, ct);
        await EnsureColumn(conn, "schema_version", "description", issues, ct);

        await EnsureUniqueIndex(conn, "users", "(email)", issues, ct);
        await EnsureUniqueIndex(conn, "refresh_tokens", "(token_hash)", issues, ct);
        await EnsureUniqueIndex(conn, "users", "(auth_provider, external_id)", issues, ct);

        if (!string.IsNullOrWhiteSpace(_options.ExpectedVersion))
            await EnsureExpectedVersion(conn, _options.ExpectedVersion!, issues, ct);

        if (issues.Count == 0)
            return;

        var message = $"Schema compatibility check failed:{Environment.NewLine}- {string.Join($"{Environment.NewLine}- ", issues)}";
        if (_options.FailFast)
            throw new InvalidOperationException(message);

        _logger.LogError("{Message}", message);
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
