using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Application.Auth.Interfaces;

public interface ITokenService
{
    string CreateAccessToken(AppUser user, IReadOnlyList<string>? roleCodes = null, IReadOnlyList<string>? permissions = null);
    string CreateRefreshToken();
    string HashToken(string token);
    /// <summary>
    /// E-posta üzerinden sisteme giriş yapmadan "Hızlı İşlem (Onay/Red/İade)" yapılabilmesi için
    /// 2 gün geçerli, ilgili onay adımına (approvalId) ve kullanıcıya (userId) özel bir JWT (Magic Link) oluşturur.
    /// </summary>
    /// <param name="approvalId">İşlem yapılacak onay adımının benzersiz kimliği.</param>
    /// <param name="userId">İşlemi yapacak yetkili kullanıcının kimliği.</param>
    /// <returns>Base64 veya string formatında imzalanmış JWT.</returns>
    string CreateQuickActionToken(Guid approvalId, Guid userId);

    /// <summary>
    /// E-posta üzerinden gelen Hızlı İşlem (Magic Link) token'ını doğrular.
    /// Süresi dolmamışsa ve imza/issuer gibi JWT güvenlik kurallarını geçiyorsa ClaimsPrincipal döner.
    /// Aksi halde null döner. (Böylece yetkisiz müdahaleler engellenmiş olur.)
    /// </summary>
    /// <param name="token">URL üzerinden gelen JWT güvenlik anahtarı.</param>
    /// <returns>Doğrulanan kullanıcı bilgilerini (Claims) içeren nesne.</returns>
    System.Security.Claims.ClaimsPrincipal? ValidateQuickActionToken(string token);

    int RefreshTokenDays { get; }   // config'i dışarıdan almak yerine property
}
