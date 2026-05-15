using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.DynamicForms.DataAccess;
using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Infrastructure.Repositories.Auth;

public class UserRepository : IUserRepository
{
    private readonly AppDbContext _db;
    private readonly DynamicFormsDbContext _dynamicDb;

    public UserRepository(AppDbContext db, DynamicFormsDbContext dynamicDb)
    {
        _db = db;
        _dynamicDb = dynamicDb;
    }

    public Task<AppUser?> GetByEmailAsync(string email, CancellationToken ct, bool track = true)
    {
        var query = track ? _db.Users : _db.Users.AsNoTracking();
        return query.FirstOrDefaultAsync(x => x.Email == email, ct);
    }

    public Task<AppUser?> GetByIdAsync(Guid id, CancellationToken ct, bool track = true)
    {
        var query = track ? _db.Users : _db.Users.AsNoTracking();
        return query.FirstOrDefaultAsync(x => x.Id == id, ct);
    }

    public async Task<IReadOnlyList<string>> GetRoleCodesAsync(Guid userId, CancellationToken ct)
    {
        return await (
            from ur in _dynamicDb.UserRoles.AsNoTracking()
            join r in _dynamicDb.Roles.AsNoTracking() on ur.RoleId equals r.Id
            where ur.UserId == userId && r.Active
            select r.Code
        ).Distinct().ToListAsync(ct);
    }

    public async Task<IReadOnlyList<string>> GetPermissionsAsync(Guid userId, CancellationToken ct)
    {
        return await (
            from ur in _db.UserRoles.AsNoTracking()
            join r in _db.Roles.AsNoTracking() on ur.RoleId equals r.Id
            join rp in _db.RolePermissions.AsNoTracking() on r.Id equals rp.RoleId
            join p in _db.Permissions.AsNoTracking() on rp.PermissionId equals p.Id
            where ur.UserId == userId && r.Active
            select p.Name
        ).Distinct().ToListAsync(ct);
    }

    public async Task AddAsync(AppUser user, CancellationToken ct)
        => await _db.Users.AddAsync(user, ct);

    public Task SaveChangesAsync(CancellationToken ct)
        => _db.SaveChangesAsync(ct);
}
