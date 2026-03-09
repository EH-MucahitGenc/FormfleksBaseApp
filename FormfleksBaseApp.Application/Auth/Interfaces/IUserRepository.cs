using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Application.Auth.Interfaces;

public interface IUserRepository
{
    Task<AppUser?> GetByEmailAsync(string email, CancellationToken ct, bool track = true);
    Task<AppUser?> GetByIdAsync(Guid id, CancellationToken ct, bool track = true);
    Task<IReadOnlyList<string>> GetRoleCodesAsync(Guid userId, CancellationToken ct);
    Task AddAsync(AppUser user, CancellationToken ct);
    Task SaveChangesAsync(CancellationToken ct);
}
