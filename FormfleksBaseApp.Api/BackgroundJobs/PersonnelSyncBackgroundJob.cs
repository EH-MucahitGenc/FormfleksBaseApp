using FormfleksBaseApp.Application.Features.Admin.Commands.SyncQdmsPersonel;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Api.BackgroundJobs;

public class PersonnelSyncBackgroundJob : CronJobService
{
    private readonly IServiceProvider _serviceProvider;

    public PersonnelSyncBackgroundJob(
        IServiceProvider serviceProvider, 
        ILogger<PersonnelSyncBackgroundJob> logger) 
        : base("0 2 * * *", GetTurkeyTimeZone(), logger)
    {
        _serviceProvider = serviceProvider;
    }

    protected override async Task<string> GetCronExpressionAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var settingsService = scope.ServiceProvider.GetRequiredService<FormfleksBaseApp.Application.Common.Interfaces.ISystemSettingsService>();
        var settings = await settingsService.GetSettingAsync<FormfleksBaseApp.Application.Common.Models.IntegrationSettings>("IntegrationSettings", new FormfleksBaseApp.Application.Common.Models.IntegrationSettings(), cancellationToken);
        
        if (settings != null && !string.IsNullOrWhiteSpace(settings.PersonnelSyncTime) && settings.PersonnelSyncTime.Contains(":"))
        {
            var parts = settings.PersonnelSyncTime.Split(':');
            if (parts.Length == 2 && int.TryParse(parts[0], out int hour) && int.TryParse(parts[1], out int minute))
            {
                return $"{minute} {hour} * * *";
            }
        }
        
        return "0 2 * * *";
    }

    private static TimeZoneInfo GetTurkeyTimeZone()
    {
        try
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Turkey Standard Time");
        }
        catch (TimeZoneNotFoundException)
        {
            return TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");
        }
    }

    protected override async Task DoWork(CancellationToken cancellationToken)
    {
        Logger.LogInformation("Personel Senkronizasyonu (Cron) tetikleniyor... Saat: {Time}", DateTime.Now);

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

            var command = new SyncQdmsPersonelCommand
            {
                ActorUserId = Guid.Empty // Bu Guid.Empty olduğunda UI'da "System (Cron)" olarak gözükecek
            };

            var response = await mediator.Send(command, cancellationToken);
            
            if (response.Success)
            {
                Logger.LogInformation("Personel Senkronizasyonu başarıyla tamamlandı: {Message}", response.Message);
            }
            else
            {
                Logger.LogWarning("Personel Senkronizasyonu başarısız oldu: {Message}", response.Message);
            }
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "Personel Senkronizasyonu sırasında beklenmeyen bir hata oluştu.");
        }
    }
}
