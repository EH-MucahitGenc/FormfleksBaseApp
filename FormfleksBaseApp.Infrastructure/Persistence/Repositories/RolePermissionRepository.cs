using Dapper;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.AdminRoles.Dtos;
using Microsoft.Extensions.Configuration;
using Npgsql;
using System;
using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Application.Common.Utils;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Infrastructure.Persistence.Repositories;

/// <summary>
/// Roller ve onlara bağlı yetkilerin (Permissions) veritabanından Dapper kullanılarak hızlı bir şekilde
/// okunması ve güncellenmesi işlemlerini üstlenen veri erişim sınıfı.
/// </summary>
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
        var permTable = TableHelper.GetTableName<AppPermission>();
        var sql = $@"
            SELECT id AS Id, name AS Name, description AS Description 
            FROM {permTable} 
            ORDER BY name";

        var permissions = await connection.QueryAsync<PermissionDto>(sql);
        return permissions.ToList().AsReadOnly();
    }

    public async Task<IReadOnlyList<string>> GetRolePermissionsAsync(Guid roleId, CancellationToken ct)
    {
        using var connection = CreateConnection();
        var rolePermTable = TableHelper.GetTableName<AppRolePermission>();
        var permTable = TableHelper.GetTableName<AppPermission>();
        var sql = $@"
            SELECT p.name 
            FROM {rolePermTable} rp 
            INNER JOIN {permTable} p ON rp.permission_id = p.id 
            WHERE rp.role_id = @RoleId";

        var permissions = await connection.QueryAsync<string>(sql, new { RoleId = roleId });
        return permissions.ToList().AsReadOnly();
    }

    public async Task UpdateRolePermissionsAsync(Guid roleId, List<string> permissionNames, CancellationToken ct)
    {
        using var connection = CreateConnection();
        await connection.OpenAsync(ct);
        using var transaction = connection.BeginTransaction();

        var rolePermTable = TableHelper.GetTableName<AppRolePermission>();
        var permTable = TableHelper.GetTableName<AppPermission>();

        try
        {
            // 1. Rolün mevcut tüm yetkilerini temizle
            var deleteSql = $"DELETE FROM {rolePermTable} WHERE role_id = @RoleId";
            await connection.ExecuteAsync(deleteSql, new { RoleId = roleId }, transaction);

            // 2. Eğer eklenecek yetki yoksa işlemi tamamla
            if (permissionNames == null || !permissionNames.Any())
            {
                await transaction.CommitAsync(ct);
                return;
            }

            // 3. İsimleri gönderilen yetkilerin ID'lerini bul
            var getIdsSql = $"SELECT id FROM {permTable} WHERE name = ANY(@Names)";
            var permissionIds = (await connection.QueryAsync<Guid>(getIdsSql, new { Names = permissionNames.ToArray() }, transaction)).ToList();

            // 4. Yeni yetkileri role_permissions tablosuna ekle
            if (permissionIds.Any())
            {
                var insertSql = $"INSERT INTO {rolePermTable} (role_id, permission_id) VALUES (@RoleId, @PermissionId)";
                
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
