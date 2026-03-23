using FormfleksBaseApp.Application.Auth.Dtos;
using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Application.Auth.Services;

public sealed class AuthTokenIssuer : IAuthTokenIssuer
{
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly ITokenService _tokens;
    private readonly IUserRepository _users;

    public AuthTokenIssuer(IRefreshTokenRepository refreshTokens, ITokenService tokens, IUserRepository users)
    {
        _refreshTokens = refreshTokens;
        _tokens = tokens;
        _users = users;
    }

    public async Task<AuthResponse> IssueAsync(AppUser user, CancellationToken ct)
    {
        var roles = await _users.GetRoleCodesAsync(user.Id, ct);
        var access = _tokens.CreateAccessToken(user, roles);

        var refreshPlain = _tokens.CreateRefreshToken();
        var refreshHash = _tokens.HashToken(refreshPlain);

        var refreshEntity = new RefreshToken
        {
            UserId = user.Id,
            TokenHash = refreshHash,
            ExpiresAt = DateTime.UtcNow.AddDays(_tokens.RefreshTokenDays)
        };

        await _refreshTokens.AddAsync(refreshEntity, ct);
        await _refreshTokens.SaveChangesAsync(ct);

        var nameParts = (user.DisplayName ?? string.Empty).Split(' ', StringSplitOptions.RemoveEmptyEntries);
        var firstName = nameParts.Length > 0 ? nameParts[0] : (user.Email?.Split('@').FirstOrDefault() ?? "Unknown");
        var lastName = nameParts.Length > 1 ? string.Join(" ", nameParts.Skip(1)) : string.Empty;

        return new AuthResponse
        {
            AccessToken = access,
            RefreshToken = refreshPlain,
            UserId = user.Id,
            FirstName = firstName,
            LastName = lastName,
            Roles = roles.ToList()
        };
    }
}
