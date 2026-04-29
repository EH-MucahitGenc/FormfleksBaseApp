namespace FormfleksBaseApp.Contracts.Auth;

/// <summary>
/// Başarılı bir giriş işlemi sonrasında istemciye dönülen yetkilendirme yanıt modeli (Token, Kullanıcı Bilgisi vb.).
/// </summary>
public class LoginResponse
{
    public string Token { get; set; } = string.Empty;
    public string RefreshToken { get; set; } = string.Empty;
    public string Username { get; set; } = string.Empty;
    public Guid UserId { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public List<string> Roles { get; set; } = new();
}
