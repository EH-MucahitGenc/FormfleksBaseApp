using System.Security.Claims;
using Microsoft.AspNetCore.Components.Authorization;
using Microsoft.AspNetCore.Components.Server.ProtectedBrowserStorage;

namespace FormfleksBaseApp.Web.Auth;

public sealed class AppAuthenticationStateProvider : AuthenticationStateProvider
{
    private readonly AuthTokenStore _tokenStore;
    private readonly ProtectedLocalStorage _localStorage;

    public AppAuthenticationStateProvider(AuthTokenStore tokenStore, ProtectedLocalStorage localStorage)
    {
        _tokenStore = tokenStore;
        _localStorage = localStorage;
    }

    public override async Task<AuthenticationState> GetAuthenticationStateAsync()
    {
        try 
        {
            if (!_tokenStore.IsAuthenticated)
            {
                var tokenResult = await _localStorage.GetAsync<string>("access_token");
                var userResult = await _localStorage.GetAsync<string>("user_name");
                var idResult = await _localStorage.GetAsync<Guid>("user_id");
                var rolesResult = await _localStorage.GetAsync<string[]>("roles");
                
                if (tokenResult.Success && !string.IsNullOrWhiteSpace(tokenResult.Value))
                {
                    var parsed = JwtTokenParser.Parse(tokenResult.Value);
                    
                    if (parsed.expiration.HasValue && parsed.expiration.Value <= DateTime.UtcNow)
                    {
                        // Token is expired! Clear from local storage
                        await _localStorage.DeleteAsync("access_token");
                        await _localStorage.DeleteAsync("user_name");
                        await _localStorage.DeleteAsync("user_id");
                        await _localStorage.DeleteAsync("roles");
                    }
                    else
                    {
                        var resolvedUserId = idResult.Success && idResult.Value != Guid.Empty
                            ? idResult.Value
                            : parsed.userId;
                        var resolvedRoles = rolesResult.Success && rolesResult.Value is { Length: > 0 }
                            ? rolesResult.Value
                            : parsed.roles.ToArray();

                        _tokenStore.Set(
                            tokenResult.Value, 
                            userResult.Success && !string.IsNullOrWhiteSpace(userResult.Value) ? userResult.Value : "user", 
                            resolvedUserId,
                            resolvedRoles);
                    }
                }
            }
        } 
        catch 
        {
            // Prerendering phase
        }

        if (!_tokenStore.IsAuthenticated)
        {
            var anonymous = new ClaimsPrincipal(new ClaimsIdentity());
            return new AuthenticationState(anonymous);
        }

        var claims = new List<Claim>
        {
            new(ClaimTypes.Name, _tokenStore.UserName ?? "user")
        };
        
        if (_tokenStore.UserId.HasValue)
            claims.Add(new Claim(ClaimTypes.NameIdentifier, _tokenStore.UserId.Value.ToString()));

        foreach (var role in _tokenStore.Roles)
            claims.Add(new Claim(ClaimTypes.Role, role));

        var identity = new ClaimsIdentity(claims, authenticationType: "Bearer");
        return new AuthenticationState(new ClaimsPrincipal(identity));
    }

    public async Task MarkAuthenticatedAsync(string token, string userName, Guid? userId, string[] roles)
    {
        var finalUserId = userId;
        _tokenStore.Set(token, userName, finalUserId, roles);
        
        try 
        {
            await _localStorage.SetAsync("access_token", token);
            await _localStorage.SetAsync("user_name", userName);
            if (finalUserId.HasValue)
                await _localStorage.SetAsync("user_id", finalUserId.Value);
            else
                await _localStorage.DeleteAsync("user_id");
            await _localStorage.SetAsync("roles", roles);
        } catch { }

        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }

    public async Task MarkLoggedOutAsync()
    {
        _tokenStore.Clear();
        try 
        {
            await _localStorage.DeleteAsync("access_token");
            await _localStorage.DeleteAsync("user_name");
            await _localStorage.DeleteAsync("user_id");
            await _localStorage.DeleteAsync("roles");
        } catch { }
        
        NotifyAuthenticationStateChanged(GetAuthenticationStateAsync());
    }
}
