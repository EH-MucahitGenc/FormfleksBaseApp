using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Api.BackgroundJobs;

public class DraftFormReminderBackgroundJob : CronJobService
{
    private readonly IServiceProvider _serviceProvider;

    public DraftFormReminderBackgroundJob(
        IServiceProvider serviceProvider, 
        ILogger<DraftFormReminderBackgroundJob> logger) 
        : base("0 9 * * *", GetTurkeyTimeZone(), logger)
    {
        _serviceProvider = serviceProvider;
    }

    protected override async Task<string> GetCronExpressionAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var settingsService = scope.ServiceProvider.GetRequiredService<FormfleksBaseApp.Application.Common.Interfaces.ISystemSettingsService>();
        var settings = await settingsService.GetSettingAsync<FormfleksBaseApp.Application.Common.Models.WorkflowSettings>("WorkflowRules", new FormfleksBaseApp.Application.Common.Models.WorkflowSettings(), cancellationToken);
        
        if (settings != null && !string.IsNullOrWhiteSpace(settings.DraftReminderTime) && settings.DraftReminderTime.Contains(":"))
        {
            var parts = settings.DraftReminderTime.Split(':');
            if (parts.Length == 2 && int.TryParse(parts[0], out int hour) && int.TryParse(parts[1], out int minute))
            {
                return $"{minute} {hour} * * *";
            }
        }
        
        return "0 9 * * *";
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
        Logger.LogInformation("Draft Form Reminder Background Job is running.");
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IDynamicFormsDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var userRepository = scope.ServiceProvider.GetRequiredService<FormfleksBaseApp.Application.Auth.Interfaces.IUserRepository>();
        
        var systemSettings = scope.ServiceProvider.GetRequiredService<FormfleksBaseApp.Application.Common.Interfaces.ISystemSettingsService>();
        var wfSettings = await systemSettings.GetSettingAsync<FormfleksBaseApp.Application.Common.Models.WorkflowSettings>("WorkflowRules", new FormfleksBaseApp.Application.Common.Models.WorkflowSettings(), cancellationToken);
        
        int autoDeleteThresholdDays = wfSettings?.DraftAutoDeleteThresholdDays > 0 ? wfSettings.DraftAutoDeleteThresholdDays : 7;
        var autoDeleteThresholdDate = DateTime.UtcNow.AddDays(-autoDeleteThresholdDays);

        var draftForms = await db.FormRequests
            .Where(r => r.Status == (short)FormRequestStatus.Draft)
            .ToListAsync(cancellationToken);

        if (!draftForms.Any())
            return;

        Logger.LogInformation($"Found {draftForms.Count} draft forms to process.");

        foreach (var draft in draftForms)
        {
            var user = await userRepository.GetByIdAsync(draft.RequestorUserId, cancellationToken, false);
            if (user == null || string.IsNullOrEmpty(user.Email)) continue;

            var formType = await db.FormTypes.FirstOrDefaultAsync(f => f.Id == draft.FormTypeId, cancellationToken);
            string formTypeName = formType?.Name ?? draft.FormTypeId.ToString();
            string requesterName = user.DisplayName ?? user.Email;

            if (draft.CreatedAt <= autoDeleteThresholdDate)
            {
                Logger.LogInformation($"Deleting draft {draft.RequestNo} because it's older than {autoDeleteThresholdDays} days.");
                
                var requestValues = await db.FormRequestValues.Where(v => v.RequestId == draft.Id).ToListAsync(cancellationToken);
                if (requestValues.Any())
                {
                    db.FormRequestValues.RemoveRange(requestValues);
                }

                db.FormRequests.Remove(draft);
                await db.SaveChangesAsync(cancellationToken);

                await emailService.SendDraftDeletedEmailAsync(
                    toEmail: user.Email,
                    requesterName: requesterName,
                    formRequestNo: draft.RequestNo,
                    formTypeName: formTypeName,
                    autoDeleteDays: autoDeleteThresholdDays,
                    cancellationToken: cancellationToken
                );
            }
            else
            {
                int waitingDays = (int)(DateTime.UtcNow - draft.CreatedAt).TotalDays;
                if (waitingDays < 1) waitingDays = 1;
                
                Logger.LogInformation($"Sending reminder for draft {draft.RequestNo}. Waiting {waitingDays} days.");

                await emailService.SendDraftReminderEmailAsync(
                    toEmail: user.Email,
                    requesterName: requesterName,
                    formRequestNo: draft.RequestNo,
                    formRequestId: draft.Id,
                    formTypeName: formTypeName,
                    waitingDays: waitingDays,
                    cancellationToken: cancellationToken
                );
            }
        }
    }
}
