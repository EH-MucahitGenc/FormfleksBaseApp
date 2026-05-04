using FormfleksBaseApp.Application.Auth.Dtos;
using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.Auth.Commands.AdLogin;

/// <summary>
/// Active Directory (LDAP) üzerinden gelen kullanıcıların sisteme giriş (Login) işlemlerini yürüten Command Handler sınıfıdır.
/// Kullanıcı sistemde ilk defa giriş yapıyorsa (veritabanında yoksa), kaydını oluşturur, 
/// varsayılan rollerini (Örn: Personel) atar ve QdmsPersoneller tablosuyla (E-posta üzerinden) otomatik eşleştirme yapar.
/// </summary>
public sealed class AdLoginCommandHandler : IRequestHandler<AdLoginCommand, AuthResponse>
{
    private const string ProviderAd = "ActiveDirectory";

    private readonly IUserRepository _users;
    private readonly IActiveDirectoryAuthenticator _ad;
    private readonly IAuthTokenIssuer _issuer;
    private readonly IDynamicFormsDbContext _db;

    public AdLoginCommandHandler(IUserRepository users, IActiveDirectoryAuthenticator ad, IAuthTokenIssuer issuer, IDynamicFormsDbContext db)
    {
        _users = users;
        _ad = ad;
        _issuer = issuer;
        _db = db;
    }

    /// <summary>
    /// Active Directory üzerinden doğrulama işlemini gerçekleştirir ve kullanıcıyı sisteme alır.
    /// Yeni kullanıcı ise AppUser kaydını oluşturur, rol atar ve senkronizasyon linklemesini (LinkedUserId) yapar.
    /// </summary>
    /// <param name="request">Kullanıcı adı ve şifresini barındıran DTO</param>
    /// <param name="ct">Asenkron iptal token'ı</param>
    /// <returns>JWT yetkilendirme token'ını içeren AuthResponse döner.</returns>
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

            // Assign default role (case-insensitive)
            var defaultRole = await _db.Roles.FirstOrDefaultAsync(r => r.Name.ToLower() == "user" || r.Name.ToLower() == "kullanıcı" || r.Name.ToLower() == "personel", ct);
            if (defaultRole != null)
            {
                _db.UserRoles.Add(new UserRoleEntity { UserId = user.Id, RoleId = defaultRole.Id });
            }

            // Auto-link to QdmsPersoneller by Email
            var personnel = await _db.QdmsPersoneller.FirstOrDefaultAsync(p => p.IsActive && p.Email != null && p.Email.ToLower() == adUser.Email.ToLower(), ct);
            if (personnel != null)
            {
                personnel.LinkedUserId = user.Id;
                _db.QdmsPersoneller.Update(personnel);
            }

            await _db.SaveChangesAsync(ct);
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
