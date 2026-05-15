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

        foreach (var (Name, Description) in AppPermissions.All)
        {
            const string sql = @"
                INSERT INTO permissions (id, name, description, created_at, active) 
                VALUES (@Id, @Name, @Description, CURRENT_TIMESTAMP, true) 
                ON CONFLICT (name) DO NOTHING;";

            await connection.ExecuteAsync(sql, new 
            { 
                Id = Guid.NewGuid(), 
                Name = Name, 
                Description = Description 
            });
        }
    }
}
