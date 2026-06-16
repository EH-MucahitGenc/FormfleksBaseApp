using Cronos;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Api.BackgroundJobs;

public abstract class CronJobService : BackgroundService
{
    private readonly string _defaultCronExpression;
    private readonly TimeZoneInfo _timeZoneInfo;
    protected readonly ILogger<CronJobService> Logger;

    protected CronJobService(string cronExpression, TimeZoneInfo timeZoneInfo, ILogger<CronJobService> logger)
    {
        _defaultCronExpression = cronExpression;
        _timeZoneInfo = timeZoneInfo;
        Logger = logger;
    }

    protected virtual async Task<string> GetCronExpressionAsync(CancellationToken cancellationToken)
    {
        return await Task.FromResult(_defaultCronExpression);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var cronStr = await GetCronExpressionAsync(stoppingToken);
            if (string.IsNullOrWhiteSpace(cronStr)) cronStr = _defaultCronExpression;
            
            var expression = CronExpression.Parse(cronStr, CronFormat.Standard);
            
            var now = DateTimeOffset.Now;
            // Saniyeleri atarak sadece dakika bazında kontrol yapıyoruz. 
            // Böylece Task.Delay 1-2 milisaniye geç uyandırsa bile hedef dakikayı kaçırmamış oluruz.
            var baseTime = new DateTimeOffset(now.Year, now.Month, now.Day, now.Hour, now.Minute, 0, now.Offset);
            
            var next = expression.GetNextOccurrence(baseTime, _timeZoneInfo, inclusive: true);
            if (!next.HasValue)
            {
                Logger.LogWarning("No next occurrence found for cron job. Background service will terminate.");
                break;
            }

            if (next.Value <= now)
            {
                // Vakti gelmiş, çalıştır
                try
                {
                    await DoWork(stoppingToken);
                }
                catch (Exception ex)
                {
                    Logger.LogError(ex, "Error occurred executing cron job.");
                }
                
                // Aynı dakika içinde tekrar çalışmaması için bir sonraki dakikanın başına kadar uyu
                var timeToNextMinute = TimeSpan.FromSeconds(60 - DateTimeOffset.Now.Second);
                try
                {
                    await Task.Delay(timeToNextMinute, stoppingToken);
                }
                catch (TaskCanceledException) { break; }
            }
            else
            {
                // Vakti gelmediyse, ayar değişikliklerini çabuk yakalamak için en fazla 1 dakika bekle
                var delay = next.Value - DateTimeOffset.Now;
                var sleepTime = delay.TotalMinutes > 1 ? TimeSpan.FromMinutes(1) : delay;
                try
                {
                    await Task.Delay(sleepTime, stoppingToken);
                }
                catch (TaskCanceledException) { break; }
            }
        }
    }

    protected abstract Task DoWork(CancellationToken cancellationToken);
}
