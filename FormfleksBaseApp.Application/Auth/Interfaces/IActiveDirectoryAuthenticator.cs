namespace FormfleksBaseApp.Application.Auth.Interfaces;

public interface IActiveDirectoryAuthenticator
{
    Task<AdUserInfo> AuthenticateAsync(string username, string password, CancellationToken ct);
}

public sealed class AdUserInfo
{
    public required string Email { get; init; }
    public required string ExternalId { get; init; }   // objectGUID string
    public string? DisplayName { get; init; }
}
