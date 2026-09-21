using Dapper;
using FormfleksBaseApp.Domain.Constants;
using Microsoft.Extensions.Configuration;
using Npgsql;
using System;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Infrastructure.Persistence.Seeders;

public class PermissionSeeder
{
    private readonly IConfiguration _configuration;

    public PermissionSeeder(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    public async Task SeedAsync()
    {
        var connectionString = _configuration.GetConnectionString("Default");
        await using var connection = new NpgsqlConnection(connectionString);
        await connection.OpenAsync();
        await using var transaction = await connection.BeginTransactionAsync();
        using var stream = typeof(PermissionSeeder).Assembly.GetManifestResourceStream(
            "FormfleksBaseApp.Infrastructure.Persistence.Seeders.RetireSurveyPermissions.sql")
            ?? throw new InvalidOperationException("Permission cleanup resource not found.");
        using var reader = new System.IO.StreamReader(stream);
        await connection.ExecuteAsync(await reader.ReadToEndAsync(), transaction: transaction);

        foreach (var (Name, Description) in AppPermissions.All)
        {
            const string sql = @"
                INSERT INTO permissions (id, name, description, created_at, active) 
                VALUES (@Id, @Name, @Description, CURRENT_TIMESTAMP, true) 
                ON CONFLICT (name) DO UPDATE SET description = EXCLUDED.description
                WHERE permissions.name LIKE 'Surveys.%';";

            await connection.ExecuteAsync(sql, new 
            { 
                Id = Guid.NewGuid(), 
                Name = Name, 
                Description = Description 
            }, transaction);
        }
        await transaction.CommitAsync();
    }
}
