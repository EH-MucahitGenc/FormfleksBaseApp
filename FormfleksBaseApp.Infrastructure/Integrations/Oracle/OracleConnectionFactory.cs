using System.Data;
using FormfleksBaseApp.Application.Integrations.Oracle;
using FormfleksBaseApp.Infrastructure.Options;
using Microsoft.Extensions.Options;
using Oracle.ManagedDataAccess.Client;

namespace FormfleksBaseApp.Infrastructure.Integrations.Oracle;

public sealed class OracleConnectionFactory : IOracleConnectionFactory
{
    private readonly OracleOptions _opts;

    public OracleConnectionFactory(IOptions<OracleOptions> opts)
        => _opts = opts.Value;

    public IDbConnection Create()
        => new OracleConnection(_opts.ConnectionString);
}
