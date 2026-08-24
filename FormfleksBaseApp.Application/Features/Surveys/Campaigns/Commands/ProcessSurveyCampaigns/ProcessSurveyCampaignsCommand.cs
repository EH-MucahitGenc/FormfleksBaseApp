using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.ProcessSurveyCampaigns;

public record ProcessSurveyCampaignsCommand() : IRequest;

public class ProcessSurveyCampaignsCommandHandler : IRequestHandler<ProcessSurveyCampaignsCommand>
{
    private readonly ISurveyDbContext _surveyContext;
    private readonly IDynamicFormsDbContext _dynamicFormsContext;
    private readonly IEmailService _emailService;
    private readonly ILogger<ProcessSurveyCampaignsCommandHandler> _logger;

    public ProcessSurveyCampaignsCommandHandler(
        ISurveyDbContext surveyContext,
        IDynamicFormsDbContext dynamicFormsContext,
        IEmailService emailService,
        ILogger<ProcessSurveyCampaignsCommandHandler> logger)
    {
        _surveyContext = surveyContext;
        _dynamicFormsContext = dynamicFormsContext;
        _emailService = emailService;
        _logger = logger;
    }

    public async Task Handle(ProcessSurveyCampaignsCommand request, CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;

        // 1. Activate Scheduled Campaigns
        var scheduledToActivate = await _surveyContext.SurveyCampaigns
            .Where(c => c.Status == SurveyCampaignStatus.Scheduled && c.StartDate != null && c.StartDate <= now)
            .ToListAsync(cancellationToken);

        foreach (var campaign in scheduledToActivate)
        {
            campaign.Status = SurveyCampaignStatus.Published; // Immediately Published! Emails will process in background.
            _logger.LogInformation("Activated Survey Campaign {CampaignId} to Published", campaign.Id);
        }

        // 2. Complete Published Campaigns that have ended
        var activeToComplete = await _surveyContext.SurveyCampaigns
            .Where(c => c.Status == SurveyCampaignStatus.Published && c.EndDate != null && c.EndDate <= now)
            .ToListAsync(cancellationToken);

        foreach (var campaign in activeToComplete)
        {
            campaign.Status = SurveyCampaignStatus.Closed;
            _logger.LogInformation("Completed Survey Campaign {CampaignId}", campaign.Id);
        }

        await _surveyContext.SaveChangesAsync(cancellationToken);

        // 2.5 Recover stale Processing records (crashed jobs)
        var staleThreshold = now.AddMinutes(-15);
        var staleAssignments = await _surveyContext.SurveyAssignments
            .Where(a => a.EmailDeliveryStatus == SurveyEmailDeliveryStatus.Processing && (a.LastEmailAttemptAt == null || a.LastEmailAttemptAt < staleThreshold))
            .ToListAsync(cancellationToken);
            
        foreach (var stale in staleAssignments)
        {
            stale.EmailDeliveryStatus = SurveyEmailDeliveryStatus.Retry;
        }
        
        if (staleAssignments.Any())
        {
            await _surveyContext.SaveChangesAsync(cancellationToken);
        }

        // 3. Process Email Queue (Outbox logic)
        var pendingAssignments = await _surveyContext.SurveyAssignments
            .Include(a => a.SurveyCampaign)
            .Where(a => (a.EmailDeliveryStatus == SurveyEmailDeliveryStatus.Queued || a.EmailDeliveryStatus == SurveyEmailDeliveryStatus.Retry) && 
                        (a.SurveyCampaign.Status == SurveyCampaignStatus.Published))
            .OrderBy(a => a.LastEmailAttemptAt ?? DateTime.MinValue) // Oldest first
            .Take(100)
            .ToListAsync(cancellationToken);

        if (pendingAssignments.Any())
        {
            // Mark as processing first to avoid double processing if job runs concurrently
            foreach (var a in pendingAssignments) 
            {
                a.EmailDeliveryStatus = SurveyEmailDeliveryStatus.Processing;
                a.LastEmailAttemptAt = now;
            }
            await _surveyContext.SaveChangesAsync(cancellationToken);

            var userIds = pendingAssignments.Select(a => a.UserId).Distinct().ToList();
            
            var users = await _dynamicFormsContext.QdmsPersoneller
                .AsNoTracking()
                .Where(u => u.LinkedUserId != null && userIds.Contains(u.LinkedUserId.Value))
                .ToDictionaryAsync(u => u.LinkedUserId!.Value, u => u.Email, cancellationToken);

            foreach (var assignment in pendingAssignments)
            {
                assignment.LastEmailAttemptAt = now;
                assignment.EmailRetryCount++;

                if (users.TryGetValue(assignment.UserId, out var email) && !string.IsNullOrWhiteSpace(email))
                {
                    try
                    {
                        var success = await _emailService.SendSurveyAssignmentEmailDirectAsync(
                            toEmail: email, 
                            campaignName: assignment.SurveyCampaign.Title, 
                            token: assignment.Token.ToString("N"),
                            cancellationToken: cancellationToken);
                            
                        if (success)
                        {
                            assignment.EmailDeliveryStatus = SurveyEmailDeliveryStatus.Delivered;
                            assignment.EmailSentAt = now;
                            if (assignment.Status == SurveyAssignmentStatus.Pending)
                            {
                                assignment.Status = SurveyAssignmentStatus.Sent;
                            }
                        }
                        else
                        {
                            throw new Exception("SMTP bağlantısı başarısız oldu veya reddedildi.");
                        }
                    }
                    catch (Exception ex)
                    {
                        _logger.LogError(ex, "Failed to send survey assignment email for assignment {AssignmentId}", assignment.Id);
                        assignment.EmailErrorMessage = ex.Message.Substring(0, Math.Min(ex.Message.Length, 500)); // Cap length
                        
                        if (assignment.EmailRetryCount >= 3)
                        {
                            assignment.EmailDeliveryStatus = SurveyEmailDeliveryStatus.Failed;
                        }
                        else
                        {
                            assignment.EmailDeliveryStatus = SurveyEmailDeliveryStatus.Retry;
                        }
                    }
                }
                else
                {
                    _logger.LogWarning("No valid email found for User {UserId} in assignment {AssignmentId}", assignment.UserId, assignment.Id);
                    assignment.EmailDeliveryStatus = SurveyEmailDeliveryStatus.Failed;
                    assignment.EmailErrorMessage = "Geçerli e-posta adresi bulunamadı.";
                }
            }

            await _surveyContext.SaveChangesAsync(cancellationToken);
        }
        
        try 
        {
            await _surveyContext.SaveChangesAsync(cancellationToken);
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateConcurrencyException ex)
        {
            _logger.LogWarning(ex, "Concurrency conflict while saving campaign/assignment status. Ignoring for this run.");
        }
    }
}
