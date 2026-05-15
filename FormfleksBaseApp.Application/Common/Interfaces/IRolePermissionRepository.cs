using FormfleksBaseApp.Application.Features.AdminRoles.Dtos;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IRolePermissionRepository
{
    Task<IReadOnlyList<PermissionDto>> GetAllPermissionsAsync(CancellationToken ct);
    Task<IReadOnlyList<string>> GetRolePermissionsAsync(Guid roleId, CancellationToken ct);
    Task UpdateRolePermissionsAsync(Guid roleId, List<string> permissionNames, CancellationToken ct);
}
