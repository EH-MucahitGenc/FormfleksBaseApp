using FormfleksBaseApp.Application.Auth.Dtos;
using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Domain.Entities;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Auth.Commands.Refresh;

public sealed class RefreshCommandHandler : IRequestHandler<RefreshCommand, AuthResponse>
{
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly ITokenService _tokens;
    private readonly IAuthTokenIssuer _issuer;

    public RefreshCommandHandler(IRefreshTokenRepository refreshTokens, ITokenService tokens, IAuthTokenIssuer issuer)
    {
        _refreshTokens = refreshTokens;
        _tokens = tokens;
        _issuer = issuer;
    }

    public async Task<AuthResponse> Handle(RefreshCommand request, CancellationToken ct)
    {
        var incomingHash = _tokens.HashToken(request.Request.RefreshToken);

        var token = await _refreshTokens.GetByTokenHashAsync(incomingHash, ct);
        if (token is null || !token.IsActive)
            throw new BusinessException("Invalid refresh token.");

        token.RevokedAt = DateTime.UtcNow;

        // rotate
        var newRefreshPlain = _tokens.CreateRefreshToken();
        var newRefreshHash = _tokens.HashToken(newRefreshPlain);
        token.ReplacedByTokenHash = newRefreshHash;

        var newTokenEntity = new RefreshToken
        {
            UserId = token.UserId,
            TokenHash = newRefreshHash,
            ExpiresAt = DateTime.UtcNow.AddDays(_tokens.RefreshTokenDays)
        };

        await _refreshTokens.AddAsync(newTokenEntity, ct);
        await _refreshTokens.SaveChangesAsync(ct);

        // access token için user lazım
        // token.User nav prop dolu değilse repo bunu Include ile getirmeli
        // en temiz: repo GetByTokenHashAsync içinde User include etsin.
        return new AuthResponse
        {
            AccessToken = _tokens.CreateAccessToken(token.User),
            RefreshToken = newRefreshPlain
        };
    }
}
