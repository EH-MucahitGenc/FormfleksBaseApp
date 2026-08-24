using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.UpdateCampaignStatus;

public record UpdateCampaignStatusCommand(Guid CampaignId, SurveyCampaignStatus NewStatus) : IRequest<bool>;

public class UpdateCampaignStatusCommandHandler : IRequestHandler<UpdateCampaignStatusCommand, bool>
{
    private readonly ISurveyDbContext _context;

    public UpdateCampaignStatusCommandHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateCampaignStatusCommand request, CancellationToken cancellationToken)
    {
        var campaign = await _context.SurveyCampaigns
            .Include(c => c.SurveyTemplateVersion)
            .FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);
            
        if (campaign == null)
            throw new FormfleksBaseApp.Application.Common.BusinessException("Kampanya bulunamadı.");

        // Validate state transitions
        if (campaign.Status == SurveyCampaignStatus.Draft)
        {
            if (request.NewStatus != SurveyCampaignStatus.Published && request.NewStatus != SurveyCampaignStatus.Scheduled && request.NewStatus != SurveyCampaignStatus.Cancelled)
                throw new FormfleksBaseApp.Application.Common.BusinessException("Taslak kampanya sadece Yayınlanabilir veya İptal edilebilir.");
            
            // If publishing, evaluate dates
            if (request.NewStatus == SurveyCampaignStatus.Published || request.NewStatus == SurveyCampaignStatus.Scheduled)
            {
                campaign.Status = campaign.StartDate <= DateTime.UtcNow ? SurveyCampaignStatus.Published : SurveyCampaignStatus.Scheduled;
                
                // Lock the template version if it's not already published
                if (campaign.SurveyTemplateVersion != null && !campaign.SurveyTemplateVersion.IsPublished)
                {
                    campaign.SurveyTemplateVersion.IsPublished = true;
                }
            }
            else
            {
                campaign.Status = request.NewStatus;
            }
        }
        else if (campaign.Status == SurveyCampaignStatus.Published || campaign.Status == SurveyCampaignStatus.Scheduled)
        {
            if (request.NewStatus != SurveyCampaignStatus.Cancelled && request.NewStatus != SurveyCampaignStatus.Closed)
                throw new FormfleksBaseApp.Application.Common.BusinessException("Aktif kampanya sadece iptal edilebilir veya tamamlanabilir.");
            campaign.Status = request.NewStatus;
        }
        else if (campaign.Status == SurveyCampaignStatus.Closed)
        {
            if (request.NewStatus != SurveyCampaignStatus.Archived)
                throw new FormfleksBaseApp.Application.Common.BusinessException("Tamamlanan kampanya sadece arşivlenebilir.");
            campaign.Status = request.NewStatus;
        }
        else
        {
            throw new FormfleksBaseApp.Application.Common.BusinessException("Bu durumdaki kampanya güncellenemez.");
        }

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
