using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.Auth.Commands.Register;

/// <summary>
/// Sistem üzerinden (Local Auth Provider) doğrudan manuel olarak kayıt olmak isteyen kullanıcıların işlemlerini yürüten Command Handler sınıfıdır.
/// Yeni kullanıcı kaydı oluşturulurken varsayılan "Personel / User" rolünü atar ve eğer kullanıcının mail adresi QdmsPersoneller 
/// tablosunda mevcutsa, onay hiyerarşisinin bozulmaması için (LinkedUserId) otomatik personel eşleştirmesi yapar.
/// </summary>
public sealed class RegisterCommandHandler : IRequestHandler<RegisterCommand, Unit>
{
    private const string ProviderLocal = "Local";
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly IDynamicFormsDbContext _db;

    public RegisterCommandHandler(IUserRepository users, IPasswordHasher hasher, IDynamicFormsDbContext db)
    {
        _users = users;
        _hasher = hasher;
        _db = db;
    }

    /// <summary>
    /// Kullanıcının formdan gönderdiği email ve şifre ile sisteme yeni AppUser kaydını oluşturur.
    /// Email sistemde zaten kayıtlıysa BusinessException fırlatır. Başarılı kayıtta rol ve personel atamalarını tamamlar.
    /// </summary>
    /// <param name="request">Kayıt olacak kullanıcının bilgilerini (Email, Password vs.) içeren DTO</param>
    /// <param name="ct">Asenkron işlem iptal token'ı</param>
    /// <returns>İşlem başarılı olduğunda Unit.Value döner.</returns>
    public async Task<Unit> Handle(RegisterCommand request, CancellationToken ct)
    {
        var email = request.Request.Email.Trim().ToLowerInvariant();

        var existing = await _users.GetByEmailAsync(email, ct, track: false);
        if (existing is not null)
            throw new BusinessException("Email already registered.");

        var user = new AppUser
        {
            Email = email,
            AuthProvider = ProviderLocal
        };

        user.PasswordHash = _hasher.HashPassword(user, request.Request.Password);

        await _users.AddAsync(user, ct);
        await _users.SaveChangesAsync(ct);

        // 1) Assign Default "User" Role
        var defaultRole = await _db.Roles.FirstOrDefaultAsync(r => r.Name.ToLower() == "user" || r.Name.ToLower() == "kullanıcı" || r.Name.ToLower() == "personel", ct);
        if (defaultRole != null)
        {
            _db.UserRoles.Add(new UserRoleEntity { UserId = user.Id, RoleId = defaultRole.Id });
        }

        // 2) Auto-link to QdmsPersoneller by Email
        var personnel = await _db.QdmsPersoneller.FirstOrDefaultAsync(p => p.IsActive && p.Email != null && p.Email.ToLower() == email, ct);
        if (personnel != null)
        {
            personnel.LinkedUserId = user.Id;
            _db.QdmsPersoneller.Update(personnel);
        }

        await _db.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
