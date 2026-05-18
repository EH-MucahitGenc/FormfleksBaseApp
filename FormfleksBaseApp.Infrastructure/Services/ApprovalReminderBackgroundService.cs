using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Infrastructure.Services;

/// <summary>
/// Sistemde 24 saatten uzun süredir bekleyen onayları tespit edip yöneticilere hatırlatma e-postası atan Hosted Service.
/// </summary>
public class ApprovalReminderBackgroundService : BackgroundService
{
    private readonly ILogger<ApprovalReminderBackgroundService> _logger;
    private readonly IServiceProvider _serviceProvider;
    private readonly TimeSpan _checkInterval = TimeSpan.FromHours(12);

    public ApprovalReminderBackgroundService(ILogger<ApprovalReminderBackgroundService> logger, IServiceProvider serviceProvider)
    {
        _logger = logger;
        _serviceProvider = serviceProvider;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Approval Reminder Background Service is starting.");

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                await ProcessRemindersAsync(stoppingToken);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Error occurred executing ProcessRemindersAsync.");
            }

            await Task.Delay(_checkInterval, stoppingToken);
        }

        _logger.LogInformation("Approval Reminder Background Service is stopping.");
    }

    private async Task ProcessRemindersAsync(CancellationToken stoppingToken)
    {
        using var scope = _serviceProvider.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IDynamicFormsDbContext>();
        var emailService = scope.ServiceProvider.GetRequiredService<IEmailService>();
        var userRepository = scope.ServiceProvider.GetRequiredService<FormfleksBaseApp.Application.Auth.Interfaces.IUserRepository>();
        var tokenService = scope.ServiceProvider.GetRequiredService<FormfleksBaseApp.Application.Auth.Interfaces.ITokenService>();

        var twentyFourHoursAgo = DateTime.UtcNow.AddHours(-24);

        // Fetch pending approvals older than 24 hours
        var pendingApprovals = await db.FormRequestApprovals
            .Where(a => a.Status == (short)ApprovalStatus.Pending && a.ActionAt == null)
            .Join(db.FormRequests, a => a.RequestId, r => r.Id, (a, r) => new { Approval = a, Request = r })
            .Where(x => x.Request.SubmittedAt <= twentyFourHoursAgo)
            .ToListAsync(stoppingToken);

        if (!pendingApprovals.Any())
            return;

        _logger.LogInformation($"Found {pendingApprovals.Count} pending approvals requiring reminders.");

        foreach (var item in pendingApprovals)
        {
            if (item.Approval.AssigneeUserId.HasValue)
            {
                var user = await userRepository.GetByIdAsync(item.Approval.AssigneeUserId.Value, stoppingToken, false);
                if (user != null && !string.IsNullOrEmpty(user.Email))
                {
                    var token = tokenService.CreateQuickActionToken(user.Id, item.Approval.Id);
                    
                    // Form tipini ve Requester adını almak için db'den sorgulayalım
                    var formType = await db.FormTypes.FirstOrDefaultAsync(f => f.Id == item.Request.FormTypeId, stoppingToken);
                    var requester = await userRepository.GetByIdAsync(item.Request.RequestorUserId, stoppingToken, false);
                    string requesterName = requester?.DisplayName ?? item.Request.RequestorUserId.ToString();
                    string formTypeName = formType?.Name ?? item.Request.FormTypeId.ToString();
                    string assigneeName = user.DisplayName ?? user.Email;

                    await emailService.SendApprovalReminderEmailAsync(
                        toEmail: user.Email,
                        assigneeName: assigneeName,
                        formRequestNo: item.Request.RequestNo,
                        formRequestId: item.Request.Id,
                        formTypeName: formTypeName,
                        requesterName: requesterName,
                        requesterCompany: "Erkurt", // Default company name if not available
                        token: token,
                        cancellationToken: stoppingToken
                    );
                    
                    _logger.LogInformation($"Reminder email sent to {user.Email} for Request {item.Request.RequestNo}");
                }
            }
        }
    }
}
