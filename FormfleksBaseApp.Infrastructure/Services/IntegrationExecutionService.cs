using System;
using System.Collections.Generic;
using System.Data;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Configuration;
using Microsoft.Extensions.Logging;
using Npgsql;
using Oracle.ManagedDataAccess.Client;
using Microsoft.Data.SqlClient;

namespace FormfleksBaseApp.Infrastructure.Services;

public class IntegrationExecutionService : IIntegrationExecutionService
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IConfiguration _configuration;
    private readonly ILogger<IntegrationExecutionService> _logger;

    public IntegrationExecutionService(
        IDynamicFormsDbContext db, 
        IConfiguration configuration, 
        ILogger<IntegrationExecutionService> logger)
    {
        _db = db;
        _configuration = configuration;
        _logger = logger;
    }

    public async Task<IDictionary<string, object>?> ExecuteQueryAsync(Guid queryId, IDictionary<string, string> parameters, CancellationToken ct)
    {
        var queryDef = await _db.IntegrationQueries.FirstOrDefaultAsync(q => q.Id == queryId, ct);
        if (queryDef == null)
            throw new BusinessException("Integration query not found.");

        string connString = _configuration.GetConnectionString(queryDef.ConnectionName);
        if (string.IsNullOrWhiteSpace(connString))
            throw new BusinessException($"Connection string for '{queryDef.ConnectionName}' not found in configuration.");

        using IDbConnection dbConnection = CreateConnection(queryDef.Engine, connString);
        
        var dapperParams = new DynamicParameters();
        foreach (var p in parameters)
        {
            dapperParams.Add(p.Key, p.Value);
        }

        try
        {
            _logger.LogInformation("Executing integration query {QueryId} ({QueryName}) with connection {ConnectionName}", 
                queryId, queryDef.Name, queryDef.ConnectionName);

            // Fetch the first row only
            var result = await dbConnection.QueryFirstOrDefaultAsync<dynamic>(queryDef.QueryTemplate, dapperParams);
            
            if (result == null) return null;

            // Convert DapperRow to Dictionary
            var dict = (IDictionary<string, object>)result;
            return dict;
        }
        catch (Exception ex)
        {
            _logger.LogError(ex, "Error executing integration query {QueryId} ({QueryName})", queryId, queryDef.Name);
            throw new BusinessException("An error occurred while executing the integration query.");
        }
    }

    private IDbConnection CreateConnection(FormfleksBaseApp.Domain.Entities.DynamicForms.DbEngine engine, string connectionString)
    {
        return engine switch
        {
            FormfleksBaseApp.Domain.Entities.DynamicForms.DbEngine.Oracle => new OracleConnection(connectionString),
            FormfleksBaseApp.Domain.Entities.DynamicForms.DbEngine.PostgreSql => new NpgsqlConnection(connectionString),
            FormfleksBaseApp.Domain.Entities.DynamicForms.DbEngine.SqlServer => new SqlConnection(connectionString),
            _ => throw new BusinessException("Desteklenmeyen veritabanı türü.")
        };
    }
}
