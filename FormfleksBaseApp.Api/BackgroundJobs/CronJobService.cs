using Cronos;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Api.BackgroundJobs;

public abstract class CronJobService : BackgroundService
{
    private readonly CronExpression _expression;
    private readonly TimeZoneInfo _timeZoneInfo;
    protected readonly ILogger<CronJobService> Logger;

    protected CronJobService(string cronExpression, TimeZoneInfo timeZoneInfo, ILogger<CronJobService> logger)
    {
        _expression = CronExpression.Parse(cronExpression, CronFormat.Standard);
        _timeZoneInfo = timeZoneInfo;
        Logger = logger;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        while (!stoppingToken.IsCancellationRequested)
        {
            var next = _expression.GetNextOccurrence(DateTimeOffset.Now, _timeZoneInfo);
            if (!next.HasValue)
            {
                Logger.LogWarning("No next occurrence found for cron job. Background service will terminate.");
                break;
            }

            var delay = next.Value - DateTimeOffset.Now;
            if (delay.TotalMilliseconds > 0)
            {
                try
                {
                    // Belirlenen süre kadar bekle (uyku modu)
                    await Task.Delay(delay, stoppingToken);
                }
                catch (TaskCanceledException)
                {
                    break;
                }
            }

            if (!stoppingToken.IsCancellationRequested)
            {
                try
                {
                    await DoWork(stoppingToken);
                }
                catch (Exception ex)
                {
                    Logger.LogError(ex, "Error occurred executing cron job.");
                }
            }
        }
    }

    protected abstract Task DoWork(CancellationToken cancellationToken);
}
