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

namespace FormfleksBaseApp.Api.BackgroundJobs;

public class ProbationTrackingCronJob : CronJobService
{
    private readonly IServiceProvider _serviceProvider;
    private static readonly Guid SystemUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    public ProbationTrackingCronJob(IServiceProvider serviceProvider, ILogger<ProbationTrackingCronJob> logger)
        : base("0 8 * * *", TimeZoneInfo.Local, logger)
    {
        _serviceProvider = serviceProvider;
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

        var today = DateTime.UtcNow.Date;

        foreach (var p in personnelList)
        {
            if (!p.Baslama_Tarihi.HasValue)
                continue;
            
            var baslamaTarihi = p.Baslama_Tarihi.Value;
            
            var logger = scope.ServiceProvider.GetRequiredService<ILogger<ProbationTrackingCronJob>>();

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
                
                if (daysLeft <= 15 && daysLeft >= -15)
                {
                    await TriggerFormAsync(p, sixMonthTemplate, dynamicFormsDb, mediator, logger, scope.ServiceProvider, 6, cancellationToken);
                }
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
        Guid? fallbackIkUserId = null;
        List<FormfleksBaseApp.Domain.Entities.AppUser> allUsers = null;
        try 
        {
            var adminUserRepo = serviceProvider.GetRequiredService<FormfleksBaseApp.Application.Features.AdminUsers.Interfaces.IAdminUserRepository>();
            allUsers = (await adminUserRepo.GetAllUsersWithRolesAsync(cancellationToken)).ToList();
            
            var ikRole = await dynamicFormsDb.Roles.FirstOrDefaultAsync(r => r.Code == "IK", cancellationToken);
            if (ikRole != null)
            {
                var globalIkUserIds = await dynamicFormsDb.UserLocationRoles
                    .Where(ulr => ulr.RoleId == ikRole.Id && ulr.IsGlobalManager && ulr.IsActive)
                    .Select(ulr => ulr.UserId)
                    .Distinct()
                    .ToListAsync(cancellationToken);

                var ikUsers = allUsers.Where(u => globalIkUserIds.Contains(u.Id)).ToList();
                if (ikUsers.Any())
                {
                    fallbackIkUserId = ikUsers.First().Id;
                    globalIkEmails = ikUsers.Where(u => !string.IsNullOrEmpty(u.Email)).Select(u => u.Email!).ToList();
                }
            }

            if (fallbackIkUserId == null && allUsers.Any()) 
            {
                var firstAdmin = allUsers.First();
                fallbackIkUserId = firstAdmin.Id;
                if (!string.IsNullOrEmpty(firstAdmin.Email)) globalIkEmails.Add(firstAdmin.Email);
            }
        } 
        catch { /* Fallback */ }

        var adminUserId = fallbackIkUserId ?? SystemUserId;

        // Find Manager
        Guid? managerUserId = null;
        string? managerEmail = null;
        string? managerName = null;
        bool managerNotFound = true;
        
        if (!string.IsNullOrEmpty(p.Ust_Pozisyon_Kodu))
        {
            var manager = await dynamicFormsDb.QdmsPersoneller.FirstOrDefaultAsync(m => m.Pozisyon_Kodu == p.Ust_Pozisyon_Kodu, cancellationToken);
            if (manager != null) 
            {
                managerNotFound = false;
                managerUserId = manager.LinkedUserId;
                managerName = $"{manager.Adi} {manager.Soyadi}";
                
                // Öncelikli olarak Sistemdeki Users (AppUser) tablosundan e-postayı almaya çalışıyoruz
                if (managerUserId.HasValue && allUsers != null)
                {
                    var userAcc = allUsers.FirstOrDefault(u => u.Id == managerUserId.Value);
                    if (userAcc != null && !string.IsNullOrWhiteSpace(userAcc.Email))
                    {
                        managerEmail = userAcc.Email;
                    }
                }

                // Eğer Users tablosunda e-posta yoksa veya henüz linklenmemişse QDMS verisine (yedek) bakıyoruz
                if (string.IsNullOrWhiteSpace(managerEmail))
                {
                    managerEmail = manager.Email;
                }

                // If we still don't have a managerUserId but we have an email, create a placeholder AppUser!
                if (managerUserId == null && !string.IsNullOrWhiteSpace(managerEmail))
                {
                    var existingUser = allUsers?.FirstOrDefault(u => !string.IsNullOrWhiteSpace(u.Email) && u.Email.Equals(managerEmail, StringComparison.OrdinalIgnoreCase));
                    if (existingUser != null)
                    {
                        managerUserId = existingUser.Id;
                        manager.LinkedUserId = existingUser.Id;
                    }
                    else
                    {
                        var newUserId = Guid.NewGuid();
                        var config = serviceProvider.GetRequiredService<Microsoft.Extensions.Configuration.IConfiguration>();
                        var connStr = config.GetConnectionString("DefaultConnection");
                    
                    using (var conn = new Npgsql.NpgsqlConnection(connStr))
                    {
                        await conn.OpenAsync(cancellationToken);
                        using var cmd = new Npgsql.NpgsqlCommand(@"
                            INSERT INTO public.users (""Id"", ""Email"", ""AuthProvider"", ""DisplayName"", ""CreatedAt"", ""IsDeleted"") 
                            VALUES (@Id, @Email, 'ActiveDirectory', @Name, @CreatedAt, false)", conn);
                        
                        cmd.Parameters.AddWithValue("Id", newUserId);
                        cmd.Parameters.AddWithValue("Email", managerEmail);
                        cmd.Parameters.AddWithValue("Name", managerName ?? (object)DBNull.Value);
                        cmd.Parameters.AddWithValue("CreatedAt", DateTime.UtcNow);
                        
                        await cmd.ExecuteNonQueryAsync(cancellationToken);
                    }
                    
                    managerUserId = newUserId;
                    manager.LinkedUserId = newUserId;
                    }
                }
            }
        }

        // Determine ownership and email recipients
        bool managerHasNoEmail = !managerNotFound && string.IsNullOrWhiteSpace(managerEmail);

        var requestorId = managerUserId ?? adminUserId;
        
        var emailsToNotify = new List<string>();
        if (!managerNotFound && !managerHasNoEmail) 
        {
            emailsToNotify.Add(managerEmail);
        }
        else 
        {
            emailsToNotify.AddRange(globalIkEmails);
        }

        if (!emailsToNotify.Any()) emailsToNotify.Add("admin@erkurtholding.com");
        
        var sicilNo = p.Sicil_No;
        
        // Güvenilir mükerrer kontrolü: RequestNo sonuna eklediğimiz Sicil No'ya göre arıyoruz.
        bool existingReqForPerson = await dynamicFormsDb.FormRequests
            .AnyAsync(r => r.FormTypeId == template.Id 
                        && r.CreatedAt > DateTime.UtcNow.AddMonths(-1)
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

            logger.LogInformation($"Successfully drafted {monthType} month probation form for {personelName} and notified {string.Join(", ", emailsToNotify)}. RequestNo: {req.RequestNo}");
        }
        catch (Exception ex)
        {
            logger.LogError(ex, $"Error sending notification for probation form of {p.Sicil_No}");
        }
    }
}
