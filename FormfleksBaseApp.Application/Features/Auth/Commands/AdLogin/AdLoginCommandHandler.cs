using FormfleksBaseApp.Application.Auth.Dtos;
using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Domain.Entities;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Auth.Commands.AdLogin;

public sealed class AdLoginCommandHandler : IRequestHandler<AdLoginCommand, AuthResponse>
{
    private const string ProviderAd = "ActiveDirectory";

    private readonly IUserRepository _users;
    private readonly IActiveDirectoryAuthenticator _ad;
    private readonly IAuthTokenIssuer _issuer;

    public AdLoginCommandHandler(IUserRepository users, IActiveDirectoryAuthenticator ad, IAuthTokenIssuer issuer)
    {
        _users = users;
        _ad = ad;
        _issuer = issuer;
    }

    public async Task<AuthResponse> Handle(AdLoginCommand request, CancellationToken ct)
    {
        var username = request.Request.Username.Trim();

        var adUser = await _ad.AuthenticateAsync(username, request.Request.Password, ct);

        var user = await _users.GetByEmailAsync(adUser.Email, ct);

        if (user is null)
        {
            user = new AppUser
            {
                Email = adUser.Email,
                AuthProvider = ProviderAd,
                ExternalId = adUser.ExternalId,
                DisplayName = adUser.DisplayName,
                PasswordHash = null
            };

            await _users.AddAsync(user, ct);
            await _users.SaveChangesAsync(ct);
        }
        else
        {
            if (!string.Equals(user.AuthProvider, ProviderAd, StringComparison.OrdinalIgnoreCase))
                throw new BusinessException("This account is not configured for Active Directory login.");

            user.ExternalId = adUser.ExternalId;
            user.DisplayName = adUser.DisplayName ?? user.DisplayName;

            await _users.SaveChangesAsync(ct);
        }

        return await _issuer.IssueAsync(user, ct);
    }
}
