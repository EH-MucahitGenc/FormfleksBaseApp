using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace FormfleksBaseApp.Api.Authorization;

public class PermissionPolicyProvider : IAuthorizationPolicyProvider
{
    public DefaultAuthorizationPolicyProvider FallbackPolicyProvider { get; }

    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options)
    {
        // Temel policy'leri desteklemek için (örn: [Authorize])
        FallbackPolicyProvider = new DefaultAuthorizationPolicyProvider(options);
    }

    public Task<AuthorizationPolicy> GetDefaultPolicyAsync() => FallbackPolicyProvider.GetDefaultPolicyAsync();

    public Task<AuthorizationPolicy?> GetFallbackPolicyAsync() => FallbackPolicyProvider.GetFallbackPolicyAsync();

    public Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        // Eğer policy "Permission:" ile başlıyorsa, dinamik olarak policy üret.
        if (policyName.StartsWith("Permission:", StringComparison.OrdinalIgnoreCase))
        {
            var policy = new AuthorizationPolicyBuilder();
            var permissionName = policyName.Substring("Permission:".Length).Trim();
            
            policy.AddRequirements(new PermissionRequirement(permissionName));
            return Task.FromResult<AuthorizationPolicy?>(policy.Build());
        }

        // Değilse varsayılan mekanizmaya (Program.cs içindeki options.AddPolicy) gönder
        return FallbackPolicyProvider.GetPolicyAsync(policyName);
    }
}
