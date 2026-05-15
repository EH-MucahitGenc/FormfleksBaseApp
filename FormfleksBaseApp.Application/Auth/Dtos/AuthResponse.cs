namespace FormfleksBaseApp.Application.Auth.Dtos;

public class AuthResponse
{
    public required string AccessToken { get; init; }
    public required string RefreshToken { get; init; }
    public Guid UserId { get; init; }
    public string FirstName { get; init; } = string.Empty;
    public string LastName { get; init; } = string.Empty;
    public List<string> Roles { get; init; } = new();
    public List<string> Permissions { get; init; } = new();
}
