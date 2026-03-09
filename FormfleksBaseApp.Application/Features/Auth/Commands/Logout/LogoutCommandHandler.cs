using FormfleksBaseApp.Application.Auth.Interfaces;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Auth.Commands.Logout;

public sealed class LogoutCommandHandler : IRequestHandler<LogoutCommand, Unit>
{
    private readonly IRefreshTokenRepository _refreshTokens;
    private readonly ITokenService _tokens;

    public LogoutCommandHandler(IRefreshTokenRepository refreshTokens, ITokenService tokens)
    {
        _refreshTokens = refreshTokens;
        _tokens = tokens;
    }

    public async Task<Unit> Handle(LogoutCommand request, CancellationToken ct)
    {
        var incomingHash = _tokens.HashToken(request.Request.RefreshToken);

        var token = await _refreshTokens.GetByTokenHashAsync(incomingHash, ct);
        if (token is null) return Unit.Value;

        token.RevokedAt = DateTime.UtcNow;
        await _refreshTokens.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
