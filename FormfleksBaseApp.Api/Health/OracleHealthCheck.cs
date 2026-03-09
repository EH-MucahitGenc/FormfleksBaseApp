using System.Data;
using System.Data.Common;
using FormfleksBaseApp.Application.Integrations.Oracle;
using Microsoft.Extensions.Diagnostics.HealthChecks;

namespace FormfleksBaseApp.Api.Health;

public sealed class OracleHealthCheck : IHealthCheck
{
    private readonly IOracleConnectionFactory _factory;

    public OracleHealthCheck(IOracleConnectionFactory factory)
    {
        _factory = factory;
    }

    public async Task<HealthCheckResult> CheckHealthAsync(
        HealthCheckContext context,
        CancellationToken ct = default)
    {
        try
        {
            using var conn = _factory.Create();
            if (conn.State != ConnectionState.Open)
                conn.Open();

            using var cmd = conn.CreateCommand();
            cmd.CommandText = "SELECT 1 FROM DUAL";
            cmd.CommandType = CommandType.Text;

            object? resultObj;
            if (cmd is DbCommand dbCommand)
            {
                resultObj = await dbCommand.ExecuteScalarAsync(ct);
            }
            else
            {
                resultObj = cmd.ExecuteScalar();
            }

            var ok = resultObj is not null && Convert.ToInt32(resultObj) == 1;
            return ok
                ? HealthCheckResult.Healthy("Oracle OK")
                : HealthCheckResult.Unhealthy("Oracle returned unexpected result");
        }
        catch (Exception ex)
        {
            return HealthCheckResult.Unhealthy("Oracle connection/query failed", ex);
        }
    }
}
