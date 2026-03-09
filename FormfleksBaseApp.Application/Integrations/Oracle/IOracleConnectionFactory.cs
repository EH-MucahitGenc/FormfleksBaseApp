using System.Data;

namespace FormfleksBaseApp.Application.Integrations.Oracle;

public interface IOracleConnectionFactory
{
    IDbConnection Create();
}
