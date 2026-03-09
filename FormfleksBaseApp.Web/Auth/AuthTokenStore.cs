namespace FormfleksBaseApp.Web.Auth;

public sealed class AuthTokenStore
{
    public string? AccessToken { get; private set; }
    public string? UserName { get; private set; }
    public Guid? UserId { get; private set; }
    public IReadOnlyList<string> Roles { get; private set; } = [];
    public bool IsAuthenticated => !string.IsNullOrWhiteSpace(AccessToken);

    public void Set(string accessToken, string userName, Guid? userId, IReadOnlyList<string> roles)
    {
        AccessToken = accessToken;
        UserName = userName;
        UserId = userId;
        Roles = roles;
    }

    public void Clear()
    {
        AccessToken = null;
        UserName = null;
        UserId = null;
        Roles = [];
    }
}
