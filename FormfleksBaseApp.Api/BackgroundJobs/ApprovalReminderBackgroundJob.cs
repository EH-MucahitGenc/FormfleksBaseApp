using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Api.BackgroundJobs;

public class ApprovalReminderBackgroundJob : CronJobService
{
    private readonly IServiceProvider _serviceProvider;

    public ApprovalReminderBackgroundJob(
        IServiceProvider serviceProvider, 
        ILogger<ApprovalReminderBackgroundJob> logger) 
        : base("0 10,15 * * *", GetTurkeyTimeZone(), logger)
    {
        _serviceProvider = serviceProvider;
    }

    protected override async Task<string> GetCronExpressionAsync(CancellationToken cancellationToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var settingsService = scope.ServiceProvider.GetRequiredService<FormfleksBaseApp.Application.Common.Interfaces.ISystemSettingsService>();
        var settings = await settingsService.GetSettingAsync<FormfleksBaseApp.Application.Common.Models.WorkflowSettings>("WorkflowRules", new FormfleksBaseApp.Application.Common.Models.WorkflowSettings(), cancellationToken);
        
        if (settings != null && !string.IsNullOrWhiteSpace(settings.ApprovalReminderTime))
        {
            // Beklenen format: "14:15,16:30" veya "10:00"
            var times = settings.ApprovalReminderTime.Split(new[] { ',', ';' }, StringSplitOptions.RemoveEmptyEntries);
            var hours = new List<int>();
            var minutes = new List<int>();
            
            foreach (var time in times)
            {
                var parts = time.Trim().Split(':');
                if (parts.Length >= 2 && int.TryParse(parts[0], out int hour) && int.TryParse(parts[1], out int minute))
                {
                    if (hour >= 0 && hour <= 23 && !hours.Contains(hour)) hours.Add(hour);
                    if (minute >= 0 && minute <= 59 && !minutes.Contains(minute)) minutes.Add(minute);
                }
                else if (parts.Length == 1 && int.TryParse(parts[0], out hour))
                {
                    if (hour >= 0 && hour <= 23 && !hours.Contains(hour)) hours.Add(hour);
                    if (!minutes.Contains(0)) minutes.Add(0);
                }
            }

            if (hours.Any())
            {
                if (!minutes.Any()) minutes.Add(0);
                string hoursCron = string.Join(",", hours.OrderBy(h => h));
                string minutesCron = string.Join(",", minutes.OrderBy(m => m));
                return $"{minutesCron} {hoursCron} * * *";
            }
        }
        
        return "0 10,15 * * *";
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
        Logger.LogInformation("Approval Reminder Background Job is running.");
        
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IDynamicFormsDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var userRepository = scope.ServiceProvider.GetRequiredService<FormfleksBaseApp.Application.Auth.Interfaces.IUserRepository>();
        var tokenService = scope.ServiceProvider.GetRequiredService<FormfleksBaseApp.Application.Auth.Interfaces.ITokenService>();

        var systemSettings = scope.ServiceProvider.GetRequiredService<FormfleksBaseApp.Application.Common.Interfaces.ISystemSettingsService>();
        var wfSettings = await systemSettings.GetSettingAsync<FormfleksBaseApp.Application.Common.Models.WorkflowSettings>("WorkflowRules", new FormfleksBaseApp.Application.Common.Models.WorkflowSettings(), cancellationToken);
        
        int thresholdHours = wfSettings?.PendingApprovalThresholdHours > 0 ? wfSettings.PendingApprovalThresholdHours : 24;
        var thresholdDate = DateTime.UtcNow.AddHours(-thresholdHours);

        // Fetch all pending approvals
        var pendingApprovalsList = await db.FormRequestApprovals
            .Where(a => a.Status == (short)ApprovalStatus.Pending && a.ActionAt == null)
            .Join(db.FormRequests, a => a.RequestId, r => r.Id, (a, r) => new { Approval = a, Request = r })
            .ToListAsync(cancellationToken);

        var delayedApprovals = new List<(FormRequestApprovalEntity Approval, FormRequestEntity Request)>();

        foreach (var item in pendingApprovalsList)
        {
            DateTime? startedWaitingAt = null;

            if (item.Approval.StepNo <= 1)
            {
                startedWaitingAt = item.Request.SubmittedAt;
            }
            else
            {
                // Önceki adımın en son ne zaman onaylandığını bul (paralel onaylar olabilir, en sonuncusu geçerli)
                var previousApproval = await db.FormRequestApprovals
                    .Where(a => a.RequestId == item.Approval.RequestId && a.StepNo == item.Approval.StepNo - 1 && a.ActionAt != null)
                    .OrderByDescending(a => a.ActionAt)
                    .FirstOrDefaultAsync(cancellationToken);
                
                startedWaitingAt = previousApproval?.ActionAt ?? item.Request.SubmittedAt;
            }

            if (startedWaitingAt.HasValue && startedWaitingAt.Value <= thresholdDate)
            {
                delayedApprovals.Add((item.Approval, item.Request));
            }
        }

        if (!delayedApprovals.Any())
            return;

        Logger.LogInformation($"Found {delayedApprovals.Count} pending approvals requiring reminders.");

        foreach (var item in delayedApprovals)
        {
            var step = await db.WorkflowSteps.FirstOrDefaultAsync(s => s.Id == item.Approval.WorkflowStepId, cancellationToken);
            if (step == null) continue;

            await SendReminderEmailsAsync(
                item.Approval.Id,
                item.Request.Id,
                item.Approval.AssigneeUserId,
                item.Approval.AssigneeRoleId,
                item.Request.RequestorUserId,
                item.Request.RequestNo,
                item.Request.FormTypeId,
                step.AssigneeType,
                step.TargetLocationRoleId,
                step.IsGlobalManagerInfoOnly,
                db,
                userRepository,
                emailService,
                tokenService,
                cancellationToken
            );
        }
    }

    private async Task SendReminderEmailsAsync(Guid approvalId, Guid requestId, Guid? assignedUserId, Guid? assignedRoleId, Guid requestorUserId, string requestNo, Guid formTypeId, short assigneeType, Guid? targetLocationRoleId, bool isGlobalManagerInfoOnly, IDynamicFormsDbContext db, FormfleksBaseApp.Application.Auth.Interfaces.IUserRepository userRepository, FormfleksBaseApp.Application.Common.Interfaces.IEmailService emailService, FormfleksBaseApp.Application.Auth.Interfaces.ITokenService tokenService, CancellationToken ct)
    {
        var targetList = new List<(string Email, string Name, Guid UserId)>();

        if (assigneeType == (short)WorkflowAssigneeType.LocationBasedRole && targetLocationRoleId.HasValue)
        {
            var authReqPers = await db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == requestorUserId && p.IsActive, ct);
            var reqLocation = authReqPers?.Isyeri_Tanimi;

            IQueryable<UserLocationRoleEntity> query = db.UserLocationRoles
                .AsNoTracking()
                .Where(x => x.IsActive && x.RoleId == targetLocationRoleId.Value);

            if (isGlobalManagerInfoOnly)
                query = query.Where(x => x.LocationName == reqLocation);
            else
                query = query.Where(x => x.IsGlobalManager || x.LocationName == reqLocation);

            var authorizedLocationUserIds = await query.Select(x => x.UserId).Distinct().ToListAsync(ct);

            foreach (var hrUserId in authorizedLocationUserIds)
            {
                var hrPers = await db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == hrUserId && p.IsActive, ct);
                if (hrPers != null && !string.IsNullOrWhiteSpace(hrPers.Email))
                {
                    targetList.Add((hrPers.Email, $"{hrPers.Adi} {hrPers.Soyadi}", hrUserId));
                }
                else
                {
                    var baseUser = await userRepository.GetByIdAsync(hrUserId, ct, false);
                    if (baseUser != null && !string.IsNullOrWhiteSpace(baseUser.Email))
                        targetList.Add((baseUser.Email, baseUser.DisplayName ?? "Bilinmeyen İK Sorumlusu", hrUserId));
                }
            }
        }
        else if (assignedUserId.HasValue)
        {
            var assgnPers = await db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == assignedUserId.Value && p.IsActive, ct);
            string? targetEmail = assgnPers?.Email;
            string assgnName = assgnPers != null ? $"{assgnPers.Adi} {assgnPers.Soyadi}" : "Bilinmeyen Sistem Kullanıcısı";

            if (string.IsNullOrWhiteSpace(targetEmail))
            {
                var baseUser = await userRepository.GetByIdAsync(assignedUserId.Value, ct, false);
                targetEmail = baseUser?.Email;
                if (baseUser != null && !string.IsNullOrWhiteSpace(baseUser.DisplayName))
                    assgnName = baseUser.DisplayName;
            }
            if (!string.IsNullOrWhiteSpace(targetEmail)) targetList.Add((targetEmail, assgnName, assignedUserId.Value));
        }
        else if (assignedRoleId.HasValue)
        {
            var roleUserIds = await db.UserRoles.AsNoTracking().Where(r => r.RoleId == assignedRoleId.Value).Select(r => r.UserId).ToListAsync(ct);
            var qdmsUsers = await db.QdmsPersoneller.AsNoTracking().Where(p => p.LinkedUserId.HasValue && roleUserIds.Contains(p.LinkedUserId.Value) && p.IsActive).ToListAsync(ct);
            
            foreach (var p in qdmsUsers)
            {
                if (!string.IsNullOrWhiteSpace(p.Email)) targetList.Add((p.Email, $"{p.Adi} {p.Soyadi}", p.LinkedUserId.Value));
            }
            
            var missingEmailsUserIds = roleUserIds.Except(qdmsUsers.Where(p => !string.IsNullOrWhiteSpace(p.Email)).Select(p => p.LinkedUserId!.Value)).ToList();
            foreach (var muid in missingEmailsUserIds)
            {
                var baseUser = await userRepository.GetByIdAsync(muid, ct, false);
                if (baseUser != null && !string.IsNullOrWhiteSpace(baseUser.Email))
                {
                    targetList.Add((baseUser.Email, string.IsNullOrWhiteSpace(baseUser.DisplayName) ? "Bilinmeyen Sistem Kullanıcısı" : baseUser.DisplayName, muid));
                }
            }
        }

        if (!targetList.Any()) return;

        var formType = await db.FormTypes.AsNoTracking().FirstOrDefaultAsync(f => f.Id == formTypeId, ct);
        var reqPers = await db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == requestorUserId && p.IsActive, ct);

        string reqName = reqPers != null ? $"{reqPers.Adi} {reqPers.Soyadi}" : "Bilinmeyen Sistem Kullanıcısı";
        if (reqPers == null || string.IsNullOrWhiteSpace(reqName) || reqName.Trim() == "")
        {
            var reqBaseUser = await userRepository.GetByIdAsync(requestorUserId, ct, false);
            if (reqBaseUser != null && !string.IsNullOrWhiteSpace(reqBaseUser.DisplayName))
            {
                reqName = reqBaseUser.DisplayName;
            }
        }
        
        string formTypeName = formType?.Name ?? formTypeId.ToString();

        foreach (var target in targetList.DistinctBy(x => x.Email))
        {
            var token = tokenService.CreateQuickActionToken(approvalId, target.UserId);
            
            await emailService.SendApprovalReminderEmailAsync(
                toEmail: target.Email,
                assigneeName: target.Name,
                formRequestNo: requestNo,
                formRequestId: requestId,
                formTypeName: formTypeName,
                requesterName: reqName,
                requesterCompany: reqPers?.Isyeri_Tanimi ?? "Erkurt", 
                token: token,
                cancellationToken: ct
            );
            
            Logger.LogInformation($"Reminder email sent to {target.Email} for Request {requestNo}");
        }
    }
}
