using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Application.Auth.Interfaces;

public interface ITokenService
{
    string CreateAccessToken(AppUser user, IReadOnlyList<string>? roleCodes = null, IReadOnlyList<string>? permissions = null);
    string CreateRefreshToken();
    string HashToken(string token);
    string CreateQuickActionToken(Guid approvalId, Guid userId);
    System.Security.Claims.ClaimsPrincipal? ValidateQuickActionToken(string token);

    int RefreshTokenDays { get; }   // config'i dışarıdan almak yerine property
}
