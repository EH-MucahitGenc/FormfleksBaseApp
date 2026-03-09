using FormfleksBaseApp.Application.Features.AdminUsers.Interfaces;
using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Infrastructure.Repositories.AdminUsers;

public class AdminUserRepository : IAdminUserRepository
{
    private readonly AppDbContext _dbContext;

    public AdminUserRepository(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }

    public Task<List<AppUser>> GetAllUsersWithRolesAsync(CancellationToken ct)
    {
        return _dbContext.Users
            .Include(x => x.UserRoles)
            .ThenInclude(ur => ur.Role)
            .AsNoTracking()
            .ToListAsync(ct);
    }

    public Task<List<AppRole>> GetActiveRolesAsync(CancellationToken ct)
    {
        return _dbContext.Set<AppRole>()
            .AsNoTracking()
            .Where(r => r.Active)
            .OrderBy(r => r.Name)
            .ToListAsync(ct);
    }

    public Task<AppUser?> GetUserByIdWithRolesAsync(Guid id, CancellationToken ct)
    {
        return _dbContext.Users
            .Include(u => u.UserRoles)
            .FirstOrDefaultAsync(u => u.Id == id, ct);
    }

    public void RemoveUserRoles(IEnumerable<AppUserRole> roles)
    {
        _dbContext.UserRoles.RemoveRange(roles);
    }

    public void AddUserRole(AppUserRole role)
    {
        _dbContext.UserRoles.Add(role);
    }

    public Task SaveChangesAsync(CancellationToken ct)
    {
        return _dbContext.SaveChangesAsync(ct);
    }
}
