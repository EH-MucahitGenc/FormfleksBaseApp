namespace FormfleksBaseApp.Contracts.Auth;

/// <summary>
/// Kullanıcı girişi için istemciden (Frontend vb.) gelen veri modeli.
/// </summary>
public class LoginRequest
{
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
}
