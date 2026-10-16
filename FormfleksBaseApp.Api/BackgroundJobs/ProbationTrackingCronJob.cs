using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using FormfleksBaseApp.Application.Features.DynamicForms.Commands.SubmitRequest;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using System.Collections.Generic;
using FormfleksBaseApp.Domain.Entities.Admin;
using FormfleksBaseApp.Domain.Constants;
using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Application.Auth.Interfaces;

namespace FormfleksBaseApp.Api.BackgroundJobs;

public class ProbationTrackingCronJob : CronJobService
{
    private readonly IServiceProvider _serviceProvider;
    public ProbationTrackingCronJob(IServiceProvider serviceProvider, ILogger<ProbationTrackingCronJob> logger)
        : base("0 8 * * *", ResolveTurkeyTimeZone(), logger)
    {
        _serviceProvider = serviceProvider;
    }

    private static TimeZoneInfo ResolveTurkeyTimeZone()
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
        Logger.LogInformation("ProbationTrackingCronJob is starting.");
        await TestTriggerCronJob(_serviceProvider, cancellationToken);
    }

    public static async Task TestTriggerCronJob(IServiceProvider serviceProvider, CancellationToken cancellationToken)
    {
        using var scope = serviceProvider.CreateScope();
        var dynamicFormsDb = scope.ServiceProvider.GetRequiredService<IDynamicFormsDbContext>();
        var mediator = scope.ServiceProvider.GetRequiredService<IMediator>();

        var probationTemplates = await dynamicFormsDb.FormTypes
            .Where(t => t.Active && (t.SystemUsageType == "2_AY_DENEME" || t.SystemUsageType == "6_AY_DENEME"))
            .ToListAsync(cancellationToken);

        if (!probationTemplates.Any()) return;

        var twoMonthTemplate = probationTemplates.FirstOrDefault(t => t.SystemUsageType == "2_AY_DENEME");
        var sixMonthTemplate = probationTemplates.FirstOrDefault(t => t.SystemUsageType == "6_AY_DENEME");

        var personnelList = await dynamicFormsDb.QdmsPersoneller
            .Where(p => p.IsActive && p.Baslama_Tarihi != null)
            .ToListAsync(cancellationToken);

        var today = TimeZoneInfo.ConvertTime(DateTimeOffset.UtcNow, ResolveTurkeyTimeZone()).Date;
        var logger = scope.ServiceProvider.GetRequiredService<ILogger<ProbationTrackingCronJob>>();

        foreach (var p in personnelList)
        {
            try
            {
                if (!p.Baslama_Tarihi.HasValue)
                    continue;

                var baslamaTarihi = p.Baslama_Tarihi.Value;

                if (twoMonthTemplate != null && p.Deneme2Ay_Trh == null)
                {
                    var targetDate = baslamaTarihi.AddMonths(2);
                    var daysLeft = (targetDate - today).TotalDays;

                    if (daysLeft <= 15 && daysLeft >= -15)
                    {
                        await TriggerFormAsync(p, twoMonthTemplate, dynamicFormsDb, mediator, logger, scope.ServiceProvider, 2, cancellationToken);
                    }
                }

                if (sixMonthTemplate != null && p.Deneme6Ay_Trh == null)
                {
                    var targetDate = baslamaTarihi.AddMonths(6);
                    var daysLeft = (targetDate - today).TotalDays;

                    if (daysLeft <= 20 && daysLeft >= -20)
                    {
                        await TriggerFormAsync(p, sixMonthTemplate, dynamicFormsDb, mediator, logger, scope.ServiceProvider, 6, cancellationToken);
                    }
                }
            }
            catch (OperationCanceledException) when (cancellationToken.IsCancellationRequested)
            {
                throw;
            }
            catch (Exception ex)
            {
                logger.LogError(ex, "Error creating probation form for personnel {SicilNo}. Processing will continue with the next personnel.", p.Sicil_No);
            }
        }
    }

    private static async Task TriggerFormAsync(
        QdmsPersonelAktarim p, 
        FormTypeEntity template, 
        IDynamicFormsDbContext dynamicFormsDb, 
        IMediator mediator,
        ILogger logger,
        IServiceProvider serviceProvider,
        int monthType,
        CancellationToken cancellationToken)
    {
        // Try to get Global IK Users
        List<string> globalIkEmails = new List<string>();
        var globalIkUserIds = new List<Guid>();
        List<AppUser> allUsers = [];
        try 
        {
            var adminUserRepo = serviceProvider.GetRequiredService<FormfleksBaseApp.Application.Features.AdminUsers.Interfaces.IAdminUserRepository>();
            allUsers = (await adminUserRepo.GetAllUsersWithRolesAsync(cancellationToken)).ToList();
            
            var ikRole = await dynamicFormsDb.Roles.FirstOrDefaultAsync(r => r.Code == "IK", cancellationToken);
            if (ikRole != null)
            {
                globalIkUserIds = await dynamicFormsDb.UserLocationRoles
                    .Where(ulr => ulr.RoleId == ikRole.Id && ulr.IsGlobalManager && ulr.IsActive)
                    .Select(ulr => ulr.UserId)
                    .Distinct()
                    .ToListAsync(cancellationToken);
            }
        } 
        catch { /* Fallback */ }

        var organizationResolver = serviceProvider.GetRequiredService<IOrganizationAssigneeResolver>();
        var userRepository = serviceProvider.GetRequiredService<IUserRepository>();
        var eligibleGlobalIkUserIds = new List<Guid>();
        foreach (var globalIkUserId in globalIkUserIds)
        {
            if (await organizationResolver.IsEligibleAssigneeAsync(globalIkUserId, cancellationToken))
                eligibleGlobalIkUserIds.Add(globalIkUserId);
        }

        Guid adminUserId = ProbationFormConstants.SystemUserId;
        foreach (var fallbackUser in allUsers)
        {
            if (await organizationResolver.IsEligibleAssigneeAsync(fallbackUser.Id, cancellationToken))
            {
                adminUserId = fallbackUser.Id;
                break;
            }
        }

        globalIkEmails = allUsers
            .Where(u => eligibleGlobalIkUserIds.Contains(u.Id) && !string.IsNullOrWhiteSpace(u.Email))
            .Select(u => u.Email)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();

        var resolution = await organizationResolver.ResolveManagerLevelAsync(p, 1, cancellationToken);
        var resolvedCandidates = new List<(Guid UserId, string Name, string? Email)>();

        foreach (var candidate in resolution.Candidates)
        {
            var userId = candidate.UserId;
            var applicationEmail = allUsers.FirstOrDefault(u => u.Id == userId)?.Email;
            var email = string.IsNullOrWhiteSpace(applicationEmail) ? candidate.Email : applicationEmail;

            if (!userId.HasValue && !string.IsNullOrWhiteSpace(email))
            {
                var existingUser = allUsers.FirstOrDefault(u =>
                    string.Equals(u.Email, email, StringComparison.OrdinalIgnoreCase));

                if (existingUser == null)
                {
                    existingUser = new AppUser
                    {
                        Id = Guid.NewGuid(),
                        Email = email,
                        AuthProvider = "ActiveDirectory",
                        DisplayName = candidate.Name,
                        CreatedAt = DateTime.UtcNow,
                        Active = true
                    };
                    await userRepository.AddAsync(existingUser, cancellationToken);
                    await userRepository.SaveChangesAsync(cancellationToken);
                    allUsers.Add(existingUser);
                }

                userId = existingUser.Id;
                var trackedPersonnel = await dynamicFormsDb.QdmsPersoneller
                    .FirstOrDefaultAsync(x => x.Id == candidate.PersonnelId, cancellationToken);
                if (trackedPersonnel != null)
                    trackedPersonnel.LinkedUserId = userId;
            }

            if (userId.HasValue && userId.Value != p.LinkedUserId)
                resolvedCandidates.Add((userId.Value, candidate.Name, email));
        }

        if (resolvedCandidates.Count > 0)
            await dynamicFormsDb.SaveChangesAsync(cancellationToken);

        resolvedCandidates = resolvedCandidates
            .GroupBy(x => x.UserId)
            .Select(g => g.First())
            .ToList();

        var managerNotFound = !resolution.IsSuccess || resolvedCandidates.Count == 0;
        var candidateUserIds = managerNotFound
            ? (eligibleGlobalIkUserIds.Count > 0 ? eligibleGlobalIkUserIds : [adminUserId])
            : resolvedCandidates.Select(x => x.UserId).ToList();
        candidateUserIds = candidateUserIds.Distinct().ToList();

        var managerName = resolvedCandidates.Count == 1
            ? resolvedCandidates[0].Name
            : "Yetkili yöneticiler";
        var managerEmails = resolvedCandidates
            .Where(x => !string.IsNullOrWhiteSpace(x.Email))
            .Select(x => x.Email!)
            .Distinct(StringComparer.OrdinalIgnoreCase)
            .ToList();
        var managerHasNoEmail = !managerNotFound && managerEmails.Count == 0;
        var requestorId = candidateUserIds.Count == 1
            ? candidateUserIds[0]
            : ProbationFormConstants.SystemUserId;

        var emailsToNotify = managerNotFound || managerHasNoEmail
            ? globalIkEmails.Distinct(StringComparer.OrdinalIgnoreCase).ToList()
            : managerEmails;

        if (!emailsToNotify.Any()) emailsToNotify.Add("admin@erkurtholding.com");
        
        var sicilNo = p.Sicil_No;
        
        // Aynı çalışma dönemi için aynı formun günlük job veya manuel tetikleme ile tekrar oluşmasını engeller.
        var employmentStartUtc = DateTime.SpecifyKind(p.Baslama_Tarihi!.Value.Date, DateTimeKind.Utc);
        bool existingReqForPerson = await dynamicFormsDb.FormRequests
            .AnyAsync(r => r.FormTypeId == template.Id
                        && r.CreatedAt >= employmentStartUtc
                        && r.RequestNo.EndsWith($"-{sicilNo}"), cancellationToken);
        if (existingReqForPerson) return;

        var req = new FormRequestEntity
        {
            Id = Guid.NewGuid(),
            FormTypeId = template.Id,
            RequestNo = $"PRB{monthType}-{DateTime.UtcNow:yyMMdd}-{sicilNo}",
            RequestorUserId = requestorId,
            Status = (short)FormRequestStatus.Draft,
            CreatedAt = DateTime.UtcNow
        };
        
        dynamicFormsDb.FormRequests.Add(req);

        foreach (var candidateUserId in candidateUserIds)
        {
            dynamicFormsDb.FormRequestAssignments.Add(new FormRequestAssignmentEntity
            {
                Id = Guid.NewGuid(),
                RequestId = req.Id,
                ApprovalId = null,
                UserId = candidateUserId,
                AssignmentType = (short)FormRequestAssignmentType.DraftEvaluator,
                CreatedAt = DateTime.UtcNow
            });
        }

        await dynamicFormsDb.SaveChangesAsync(cancellationToken);

        var fields = await dynamicFormsDb.FormFields.Where(f => f.FormTypeId == template.Id && f.Active).ToListAsync(cancellationToken);
        
        foreach (var field in fields)
        {
            string val = null;
            var fKey = field.FieldKey.ToLowerInvariant();
            var fLabel = field.Label?.ToUpperInvariant()
                .Replace("İ", "I").Replace("Ş", "S").Replace("Ğ", "G")
                .Replace("Ü", "U").Replace("Ö", "O").Replace("Ç", "C") ?? "";
            
            if (fLabel.Contains("AD") && fLabel.Contains("SOYAD")) val = $"{p.Adi} {p.Soyadi}";
            else if (fLabel == "AD" || fLabel == "ADI") val = p.Adi;
            else if (fLabel == "SOYAD" || fLabel == "SOYADI") val = p.Soyadi;
            else if (fLabel.Contains("SICIL")) val = p.Sicil_No;
            else if (fLabel.Contains("DEPARTMAN") || fLabel.Contains("BOLUM")) val = p.Departman_Adi;
            else if (fLabel.Contains("UNVAN") || fLabel.Contains("POZISYON")) val = p.Pozisyon_Aciklamasi;
            else if (fLabel.Contains("BASLAMA") || fLabel.Contains("GIRIS")) val = p.Baslama_Tarihi?.ToString("dd.MM.yyyy");
            
            if (val != null)
            {
                dynamicFormsDb.FormRequestValues.Add(new FormRequestValueEntity
                {
                    Id = Guid.NewGuid(),
                    RequestId = req.Id,
                    FieldId = field.Id,
                    FieldKey = field.FieldKey,
                    ValueText = val
                });
            }
        }
        await dynamicFormsDb.SaveChangesAsync(cancellationToken);

        // Send Email
        try
        {
            var emailService = serviceProvider.GetRequiredService<IEmailService>();
            var emails = emailsToNotify.Distinct().ToList();
            string personelName = $"{p.Adi} {p.Soyadi}";
            string reqCompany = "Formfleks"; // Default fallback

            if (managerNotFound)
            {
                await emailService.SendProbationManagerMissingEmailAsync(emails, personelName, monthType, req.Id, req.RequestNo, reqCompany, cancellationToken);
            }
            else if (managerHasNoEmail)
            {
                await emailService.SendProbationManagerEmailMissingEmailAsync(emails, personelName, managerName, monthType, req.Id, req.RequestNo, reqCompany, cancellationToken);
            }
            else
            {
                await emailService.SendProbationDraftEmailAsync(emails, managerName, personelName, monthType, req.Id, req.RequestNo, reqCompany, cancellationToken);
            }

            var notificationService = serviceProvider.GetRequiredService<IAppNotificationService>();
            foreach (var candidateUserId in candidateUserIds)
            {
                await notificationService.SendNotificationAsync(
                    candidateUserId,
                    "Yeni Deneme Süresi Değerlendirmesi",
                    $"{personelName} için {monthType} aylık değerlendirme formu bekliyor.",
                    $"/forms/{req.Id}",
                    req.Id,
                    cancellationToken);
            }

            logger.LogInformation($"Successfully drafted {monthType} month probation form for {personelName} and notified {string.Join(", ", emailsToNotify)}. RequestNo: {req.RequestNo}");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"Error sending notification for probation form of {p.Sicil_No}");
        }
    }
}
