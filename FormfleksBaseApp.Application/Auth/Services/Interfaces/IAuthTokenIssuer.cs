using FormfleksBaseApp.Application.Auth.Dtos;
using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Application.Auth.Interfaces;

public interface IAuthTokenIssuer
{
    Task<AuthResponse> IssueAsync(AppUser user, CancellationToken ct);
}
