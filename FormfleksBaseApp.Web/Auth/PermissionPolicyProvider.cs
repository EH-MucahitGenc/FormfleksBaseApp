using Microsoft.AspNetCore.Authorization;
using Microsoft.Extensions.Options;

namespace FormfleksBaseApp.Web.Auth;

public class PermissionPolicyProvider : DefaultAuthorizationPolicyProvider
{
    private readonly AuthorizationOptions _options;

    public PermissionPolicyProvider(IOptions<AuthorizationOptions> options) : base(options)
    {
        _options = options.Value;
    }

    public override async Task<AuthorizationPolicy?> GetPolicyAsync(string policyName)
    {
        // Önce varsayılan politikalara (örn. "AdminOnly") bak
        var policy = await base.GetPolicyAsync(policyName);

        if (policy == null)
        {
            // Eğer policy önceden kaydedilmemişse, isminden yeni bir PermissionRequirement policy'si uydur
            var policyBuilder = new AuthorizationPolicyBuilder();
            policyBuilder.AddRequirements(new PermissionRequirement(policyName));
            policy = policyBuilder.Build();
            
            // Sonraki aramalar için önbelleğe al
            _options.AddPolicy(policyName, policy);
        }

        return policy;
    }
}
