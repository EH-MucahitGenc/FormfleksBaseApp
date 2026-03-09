using FormfleksBaseApp.Application.Auth.Dtos;
using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Auth.Commands.Login;

public sealed class LoginCommandHandler : IRequestHandler<LoginCommand, AuthResponse>
{
    private const string ProviderLocal = "Local";

    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly IAuthTokenIssuer _issuer;

    public LoginCommandHandler(IUserRepository users, IPasswordHasher hasher, IAuthTokenIssuer issuer)
    {
        _users = users;
        _hasher = hasher;
        _issuer = issuer;
    }

    public async Task<AuthResponse> Handle(LoginCommand request, CancellationToken ct)
    {
        var email = request.Request.Email.Trim().ToLowerInvariant();

        var user = await _users.GetByEmailAsync(email, ct, track: false);
        if (user is null)
            throw new BusinessException("Invalid email or password.");

        if (!string.Equals(user.AuthProvider, ProviderLocal, StringComparison.OrdinalIgnoreCase))
            throw new BusinessException("This account is not configured for Local login.");

        if (string.IsNullOrWhiteSpace(user.PasswordHash))
            throw new BusinessException("This account has no password set.");

        var ok = _hasher.VerifyHashedPassword(user, user.PasswordHash, request.Request.Password);
        if (!ok)
            throw new BusinessException("Invalid email or password.");

        return await _issuer.IssueAsync(user, ct);
    }
}
