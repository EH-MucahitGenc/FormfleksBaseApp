using FormfleksBaseApp.Web.Auth;
using FormfleksBaseApp.Web.Services;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Components.Authorization;
using System.Security.Claims;

var builder = WebApplication.CreateBuilder(args);

builder.Services.AddRazorPages();
builder.Services.AddServerSideBlazor();
builder.Services.AddAuthorizationCore(options =>
{
    options.AddPolicy("HasAppRole", policy =>
        policy.RequireAuthenticatedUser()
              .RequireAssertion(ctx => ctx.User.Claims.Any(c =>
                  c.Type == ClaimTypes.Role && !string.IsNullOrWhiteSpace(c.Value))));

    options.AddPolicy("AdminOrHr", policy =>
        policy.RequireRole("Admin", "HR"));

    options.AddPolicy("AdminOnly", policy =>
        policy.RequireRole("Admin"));
});
builder.Services.AddSingleton<IAuthorizationPolicyProvider, PermissionPolicyProvider>();
builder.Services.AddScoped<IAuthorizationHandler, PermissionAuthorizationHandler>();

builder.Services.AddScoped<AuthTokenStore>();
builder.Services.AddScoped<AppAuthenticationStateProvider>();
builder.Services.AddScoped<AuthenticationStateProvider>(sp => sp.GetRequiredService<AppAuthenticationStateProvider>());

var apiBaseUrl = builder.Configuration["Api:BaseUrl"] ?? "https://localhost:5001";
builder.Services.AddHttpClient("Api", client =>
{
    client.BaseAddress = new Uri(apiBaseUrl);
});

builder.Services.AddScoped<ApiClient>();

var app = builder.Build();

if (!app.Environment.IsDevelopment())
{
    app.UseExceptionHandler("/Error");
    app.UseHsts();
}

app.UseHttpsRedirection();
app.UseStaticFiles();
app.UseRouting();

app.MapBlazorHub();
app.MapFallbackToPage("/_Host");

app.Run();
