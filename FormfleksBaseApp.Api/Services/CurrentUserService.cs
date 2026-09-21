using System;
using System.Security.Claims;
using FormfleksBaseApp.Application.Common.Interfaces;
using Microsoft.AspNetCore.Http;

namespace FormfleksBaseApp.Api.Services;

public class CurrentUserService : ICurrentUserService
{
    private readonly IHttpContextAccessor _httpContextAccessor;

    public CurrentUserService(IHttpContextAccessor httpContextAccessor)
    {
        _httpContextAccessor = httpContextAccessor;
    }

    public Guid? UserId
    {
        get
        {
            var val = _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.NameIdentifier);
            return Guid.TryParse(val, out var id) ? id : null;
        }
    }

    public string? Email => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Email);

    public string? DisplayName => _httpContextAccessor.HttpContext?.User?.FindFirstValue(ClaimTypes.Name);

    public bool IsAuthenticated => _httpContextAccessor.HttpContext?.User?.Identity?.IsAuthenticated ?? false;

    public bool HasPermission(string permission)
    {
        var user = _httpContextAccessor.HttpContext?.User;
        if (user == null) return false;
        
        if (user.HasClaim("Permission", permission))
            return true;

        if (user.IsInRole("Admin") || user.IsInRole("ADMIN") || user.IsInRole("admin"))
        {
            if (!permission.StartsWith("Surveys.Results.", StringComparison.OrdinalIgnoreCase))
                return true;
        }

        return false;
    }

    public bool IsInRole(string role)
    {
        return _httpContextAccessor.HttpContext?.User?.IsInRole(role) ?? false;
    }
}
