using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Application.Features.AdminUsers.Interfaces;

public interface IAdminUserRepository
{
    Task<List<AppUser>> GetAllUsersWithRolesAsync(CancellationToken ct);
    Task<List<AppRole>> GetActiveRolesAsync(CancellationToken ct);
    Task<AppUser?> GetUserByIdWithRolesAsync(Guid id, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
    void RemoveUserRoles(IEnumerable<AppUserRole> roles);
    void AddUserRole(AppUserRole role);
}
