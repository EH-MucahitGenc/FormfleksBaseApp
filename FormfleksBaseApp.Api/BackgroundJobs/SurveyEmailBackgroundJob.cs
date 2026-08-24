using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.ProcessSurveyCampaigns;
using MediatR;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Api.BackgroundJobs;

/// <summary>
/// Anket modülü için arka plan işlerini yürüten servis.
/// Görevleri:
/// 1. Başlama tarihi gelmiş 'Draft' kampanyaları 'Active' yapar.
/// 2. Bitiş tarihi geçmiş 'Active' kampanyaları 'Completed' yapar.
/// 3. 'Active' olan kampanyalardaki 'Pending' katılımcılara anket davet emaillerini (batch olarak) gönderir.
/// </summary>
public class SurveyEmailBackgroundJob : CronJobService
{
    private readonly IServiceProvider _serviceProvider;

    public SurveyEmailBackgroundJob(
        IServiceProvider serviceProvider, 
        ILogger<SurveyEmailBackgroundJob> logger) 
        : base("*/5 * * * *", GetTurkeyTimeZone(), logger) // Varsayılan: Her 5 dakikada bir çalışır
    {
        _serviceProvider = serviceProvider;
    }

    protected override async Task<string> GetCronExpressionAsync(CancellationToken cancellationToken)
    {
        // Gerekirse sistem ayarlarından cron ifadesi çekilebilir.
        // Şu an varsayılan olarak her 5 dakikada bir çalışmasını döndürüyoruz.
        return await Task.FromResult("*/5 * * * *");
    }

    protected override async Task DoWork(CancellationToken cancellationToken)
    {
        Logger.LogInformation("SurveyEmailBackgroundJob started processing.");

        try
        {
            using var scope = _serviceProvider.CreateScope();
            var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();
            
            await mediator.Send(new ProcessSurveyCampaignsCommand(), cancellationToken);
            
            Logger.LogInformation("SurveyEmailBackgroundJob finished processing successfully.");
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "An error occurred while processing SurveyEmailBackgroundJob.");
        }
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
}
