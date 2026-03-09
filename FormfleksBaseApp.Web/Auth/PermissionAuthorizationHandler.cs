using System.Security.Claims;
using Microsoft.AspNetCore.Authorization;

namespace FormfleksBaseApp.Web.Auth;

public class PermissionAuthorizationHandler : AuthorizationHandler<PermissionRequirement>
{
    // Gerçek senaryoda burada IAuthService veya DbContext inject edilerek kullanıcının 
    // izinleri veritabanından sorgulanır. Şimdilik In-Memory veya Claim bazlı çalışacağı varsayılıyor.
    
    protected override Task HandleRequirementAsync(AuthorizationHandlerContext context, PermissionRequirement requirement)
    {
        var user = context.User;
        if (user.Identity is null || !user.Identity.IsAuthenticated)
        {
            return Task.CompletedTask;
        }

        // 1. Kural: Eğer kullanıcı Admin ise, hangi yetkiyi isterse istesin koşulsuz onaylıyoruz (Admin Bypass).
        if (user.IsInRole("Admin"))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        // 2. Kural: Eğer kullanıcıda bu izni belirten claim/rol varsa.
        // Gelecekte burada kullanıcının permissionları veritabanından alınıp requirement.Permission ile karşılaştırılacak.
        if (user.HasClaim(c => c.Type == "Permission" && c.Value == requirement.Permission))
        {
            context.Succeed(requirement);
            return Task.CompletedTask;
        }

        return Task.CompletedTask;
    }
}
