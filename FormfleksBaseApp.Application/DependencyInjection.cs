using Microsoft.Extensions.DependencyInjection;
using System.Reflection;

namespace FormfleksBaseApp.Application;

public static class DependencyInjection
{
    public static IServiceCollection AddApplicationServices(this IServiceCollection services)
    {
        services.AddMediatR(cfg =>
        {
            cfg.RegisterServicesFromAssembly(Assembly.GetExecutingAssembly());
        });
        services.AddScoped<Common.Interfaces.IApprovalEngineService, DynamicForms.Business.Services.ApprovalEngineService>();

        return services;
    }
}
