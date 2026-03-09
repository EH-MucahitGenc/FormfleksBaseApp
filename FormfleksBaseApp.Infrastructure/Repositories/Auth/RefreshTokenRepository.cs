using Microsoft.EntityFrameworkCore;
using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Infrastructure.Persistence;

namespace FormfleksBaseApp.Infrastructure.Repositories.Auth;

public class RefreshTokenRepository : IRefreshTokenRepository
{
    private readonly AppDbContext _db;

    public RefreshTokenRepository(AppDbContext db) => _db = db;

    public Task<RefreshToken?> GetByTokenHashAsync(string tokenHash, CancellationToken ct)
        => _db.RefreshTokens
              .Include(x => x.User)
              .FirstOrDefaultAsync(x => x.TokenHash == tokenHash, ct);

    public async Task AddAsync(RefreshToken token, CancellationToken ct)
        => await _db.RefreshTokens.AddAsync(token, ct);

    public Task SaveChangesAsync(CancellationToken ct)
        => _db.SaveChangesAsync(ct);
}
