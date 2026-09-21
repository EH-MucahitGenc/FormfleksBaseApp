using Microsoft.AspNetCore.Authorization;
using System.Security.Claims;

namespace FormfleksBaseApp.Api.Authorization;

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        // 1. ADMIN BYPASS: Sistemdeki 'Admin' rolüne sahip kullanıcılar tüm yetkilerden otomatik geçer.
        // Hassas anket sonuçlarına erişim yetkileri hariç (Surveys.Results.*)
        if (context.User.IsInRole("Admin") || context.User.IsInRole("ADMIN") || context.User.IsInRole("admin"))
        {
            if (!requirement.Permission.StartsWith("Surveys.Results.", StringComparison.OrdinalIgnoreCase))
            {
                context.Succeed(requirement);
                return Task.CompletedTask;
            }
        }
        // 2. TOKEN CLAIM CHECK: Kullanıcının token'ında (Permission) bu yetki var mı?
        var permissions = context.User.Claims
            .Where(x => x.Type == "Permission" || x.Type == "permission")
            .Select(x => x.Value);

        if (permissions.Contains(requirement.Permission, StringComparer.OrdinalIgnoreCase))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        return Task.CompletedTask;
    }
}
