using Dapper;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.AdminRoles.Dtos;
using Microsoft.Extensions.Configuration;
using Npgsql;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Infrastructure.Persistence.Repositories;

public class RolePermissionRepository : IRolePermissionRepository
{
    private readonly IConfiguration _configuration;

    public RolePermissionRepository(IConfiguration configuration)
    {
        _configuration = configuration;
    }

    private NpgsqlConnection CreateConnection()
    {
        return new NpgsqlConnection(_configuration.GetConnectionString("Default"));
    }

    public async Task<IReadOnlyList<PermissionDto>> GetAllPermissionsAsync(CancellationToken ct)
    {
        using var connection = CreateConnection();
        const string sql = @"
            SELECT id AS Id, name AS Name, description AS Description 
            FROM permissions 
            ORDER BY name";

        var permissions = await connection.QueryAsync<PermissionDto>(sql);
        return permissions.ToList().AsReadOnly();
    }

    public async Task<IReadOnlyList<string>> GetRolePermissionsAsync(Guid roleId, CancellationToken ct)
    {
        using var connection = CreateConnection();
        const string sql = @"
            SELECT p.name 
            FROM role_permissions rp 
            INNER JOIN permissions p ON rp.permission_id = p.id 
            WHERE rp.role_id = @RoleId";

        var permissions = await connection.QueryAsync<string>(sql, new { RoleId = roleId });
        return permissions.ToList().AsReadOnly();
    }

    public async Task UpdateRolePermissionsAsync(Guid roleId, List<string> permissionNames, CancellationToken ct)
    {
        using var connection = CreateConnection();
        await connection.OpenAsync(ct);
        using var transaction = connection.BeginTransaction();

        try
        {
            // 1. Rolün mevcut tüm yetkilerini temizle
            const string deleteSql = "DELETE FROM role_permissions WHERE role_id = @RoleId";
            await connection.ExecuteAsync(deleteSql, new { RoleId = roleId }, transaction);

            // 2. Eğer eklenecek yetki yoksa işlemi tamamla
            if (permissionNames == null || !permissionNames.Any())
            {
                await transaction.CommitAsync(ct);
                return;
            }

            // 3. İsimleri gönderilen yetkilerin ID'lerini bul
            const string getIdsSql = "SELECT id FROM permissions WHERE name = ANY(@Names)";
            var permissionIds = (await connection.QueryAsync<Guid>(getIdsSql, new { Names = permissionNames.ToArray() }, transaction)).ToList();

            // 4. Yeni yetkileri role_permissions tablosuna ekle
            if (permissionIds.Any())
            {
                const string insertSql = "INSERT INTO role_permissions (role_id, permission_id) VALUES (@RoleId, @PermissionId)";
                
                var insertData = permissionIds.Select(pid => new { RoleId = roleId, PermissionId = pid });
                await connection.ExecuteAsync(insertSql, insertData, transaction);
            }

            await transaction.CommitAsync(ct);
        }
        catch
        {
            await transaction.RollbackAsync(ct);
            throw;
        }
    }
}
