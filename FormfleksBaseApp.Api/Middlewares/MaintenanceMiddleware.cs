using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Common.Models;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;
using System.Text.Json;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Api.Middlewares;

public class MaintenanceMiddleware
{
    private readonly RequestDelegate _next;

    public MaintenanceMiddleware(RequestDelegate next)
    {
        _next = next;
    }

    public async Task InvokeAsync(HttpContext context, ISystemSettingsService systemSettingsService)
    {
        if (context.Request.Method == "OPTIONS" ||
            context.Request.Path.StartsWithSegments("/api/public") ||
            context.Request.Path.StartsWithSegments("/api/auth/login") ||
            context.Request.Path.StartsWithSegments("/api/auth/ad-login") ||
            context.Request.Path.StartsWithSegments("/api/auth/refresh"))
        {
            await _next(context);
            return;
        }

        var appSettings = systemSettingsService.GetSetting<AppSettings>("AppSettings");
        
        if (appSettings != null && appSettings.MaintenanceMode)
        {
            // Eğer kullanıcı Admin ise bakımdan etkilenmesin
            if (context.User.Identity?.IsAuthenticated == true)
            {
                if (context.User.IsInRole("Admin") || context.User.IsInRole("SystemAdmin") || 
                    context.User.IsInRole("ADMIN") || context.User.IsInRole("admin"))
                {
                    await _next(context);
                    return;
                }
            }

            // Aksi takdirde 503 dön
            context.Response.StatusCode = StatusCodes.Status503ServiceUnavailable;
            context.Response.ContentType = "application/json";
            
            var response = new 
            {
                message = "Sistem şu anda planlı bakım aşamasındadır. Lütfen daha sonra tekrar deneyiniz.",
                isMaintenance = true
            };

            await context.Response.WriteAsync(JsonSerializer.Serialize(response));
            return;
        }

        await _next(context);
    }
}
