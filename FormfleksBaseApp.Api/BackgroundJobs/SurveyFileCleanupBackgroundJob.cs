using FormfleksBaseApp.Application.Common.Interfaces;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.IO;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Api.BackgroundJobs;

public class SurveyFileCleanupBackgroundJob : CronJobService
{
    private readonly IServiceProvider _serviceProvider;
    private readonly IHostEnvironment _env;

    public SurveyFileCleanupBackgroundJob(
        IServiceProvider serviceProvider, 
        IHostEnvironment env,
        ILogger<SurveyFileCleanupBackgroundJob> logger) 
        : base("0 3 * * *", GetTurkeyTimeZone(), logger)
    {
        _serviceProvider = serviceProvider;
        _env = env;
    }

    protected override async Task<string> GetCronExpressionAsync(CancellationToken cancellationToken)
    {
        return await Task.FromResult("0 3 * * *");
    }

    protected override async Task DoWork(CancellationToken cancellationToken)
    {
        Logger.LogInformation("SurveyFileCleanupBackgroundJob started.");

        try
        {
            var uploadPath = Path.Combine(_env.ContentRootPath, "App_Data", "survey-uploads");
            if (!Directory.Exists(uploadPath))
                return;

            using var scope = _serviceProvider.CreateScope();
            var context = scope.ServiceProvider.GetRequiredService<ISurveyDbContext>();

            // 1. Clean up expired DB temp records
            var expiredTempRecords = await context.SurveyTempFileUploads
                .Where(t => t.ExpiresAt < DateTime.UtcNow)
                .ToListAsync(cancellationToken);
                
            if (expiredTempRecords.Any())
            {
                context.SurveyTempFileUploads.RemoveRange(expiredTempRecords);
                await context.SaveChangesAsync(cancellationToken);
                Logger.LogInformation("Deleted {Count} expired temp file DB records.", expiredTempRecords.Count);
            }

            var thresholdDate = DateTime.UtcNow.AddHours(-24);
            var allPhysicalFiles = Directory.GetFiles(uploadPath);

            int deletedCount = 0;

            foreach (var filePath in allPhysicalFiles)
            {
                var fileInfo = new FileInfo(filePath);
                if (fileInfo.CreationTimeUtc < thresholdDate)
                {
                    var fileName = fileInfo.Name;
                    
                    var isReferenced = await context.SurveyAnswerFiles.AnyAsync(f => f.FilePath == fileName, cancellationToken);
                    if (!isReferenced)
                    {
                        try
                        {
                            File.Delete(filePath);
                            deletedCount++;
                        }
                        catch (Exception ex)
                        {
                            Logger.LogWarning(ex, "Failed to delete orphan file: {FileName}", fileName);
                        }
                    }
                }
            }
            
            Logger.LogInformation("SurveyFileCleanupBackgroundJob finished. Deleted {Count} orphan files.", deletedCount);
        }
        catch (Exception ex)
        {
            Logger.LogError(ex, "An error occurred while processing SurveyFileCleanupBackgroundJob.");
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
