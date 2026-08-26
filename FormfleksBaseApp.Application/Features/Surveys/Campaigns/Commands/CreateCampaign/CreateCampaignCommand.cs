using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.Surveys;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.CreateCampaign;

public record CreateCampaignCommand(
    Guid TemplateId, 
    string CampaignName, 
    string Description,
    DateTime StartDate,
    DateTime EndDate,
    bool IsAnonymous,
    FormfleksBaseApp.Application.Features.Surveys.Common.AudienceFilter AudienceDefinition,
    List<CampaignViewerDto>? Viewers,
    bool SaveAsDraft // If true, status=Draft. Else, Published/Scheduled based on StartDate.
) : IRequest<Guid>;

public record CampaignViewerDto(Guid UserId, FormfleksBaseApp.Domain.Enums.Surveys.SurveyViewerAccessLevel AccessLevel);

public class CreateCampaignCommandHandler : IRequestHandler<CreateCampaignCommand, Guid>
{
    private readonly ISurveyDbContext _context;
    private readonly IServiceProvider _serviceProvider;

    public CreateCampaignCommandHandler(ISurveyDbContext context, IServiceProvider serviceProvider)
    {
        _context = context;
        _serviceProvider = serviceProvider;
    }

    public async Task<Guid> Handle(CreateCampaignCommand request, CancellationToken cancellationToken)
    {
        var template = await _context.SurveyTemplates
            .Include(t => t.Versions)
            .FirstOrDefaultAsync(t => t.Id == request.TemplateId, cancellationToken);
            
        if (template == null) throw new FormfleksBaseApp.Application.Common.NotFoundException("Şablon bulunamadı.");

        // If not saving as draft, we MUST have a published version.
        // We will take the Draft version and mark it as Published, locking it.
        var version = template.Versions.FirstOrDefault(v => !v.IsPublished);
        
        if (!request.SaveAsDraft)
        {
            if (version != null)
            {
                // Lock the draft version as published
                version.IsPublished = true;
                
                // Note: The next time someone edits in Studio, a NEW draft version will be created by SaveTemplateCommand!
            }
            else
            {
                // No draft, use the latest published version
                version = template.Versions.OrderByDescending(v => v.VersionNumber).FirstOrDefault(v => v.IsPublished);
                if (version == null) throw new FormfleksBaseApp.Application.Common.BusinessException("Yayınlanacak veya yayınlanmış bir sürüm bulunamadı.");
            }
        }
        else
        {
            if (version == null)
            {
                // Trying to save as draft but only published versions exist. We can't use a published version for a new draft campaign directly.
                throw new FormfleksBaseApp.Application.Common.BusinessException("Sadece yayınlanmış şablon sürümleri var. Kampanyayı taslak kaydetmek için önce şablonu düzenleyerek yeni bir taslak sürüm oluşturun.");
            }
        }

        if (request.AudienceDefinition == null)
            throw new FormfleksBaseApp.Application.Common.BusinessException("Hedef kitle tanımı (AudienceDefinition) zorunludur.");

        var status = request.SaveAsDraft ? SurveyCampaignStatus.Draft : 
            (request.StartDate <= DateTime.UtcNow ? SurveyCampaignStatus.Published : SurveyCampaignStatus.Scheduled);

        var targetAudienceJson = System.Text.Json.JsonSerializer.Serialize(request.AudienceDefinition);

        var campaign = new SurveyCampaign
        {
            Id = Guid.NewGuid(),
            SurveyTemplateVersionId = version.Id,
            Title = request.CampaignName,
            Description = request.Description,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            IsAnonymous = request.IsAnonymous,
            Status = status,
            TargetAudienceJson = targetAudienceJson
        };

        _context.SurveyCampaigns.Add(campaign);

        if (request.Viewers != null)
        {
            // Note: we can group by UserId and pick the highest access level if they sent duplicates, but DistinctBy handles it simply enough.
            foreach (var viewerDto in request.Viewers.DistinctBy(v => v.UserId))
            {
                var viewer = new SurveyResultViewer
                {
                    Id = Guid.NewGuid(),
                    SurveyCampaignId = campaign.Id,
                    UserId = viewerDto.UserId,
                    AccessLevel = viewerDto.AccessLevel
                };
                _context.SurveyResultViewers.Add(viewer);
            }
        }

        await _context.SaveChangesAsync(cancellationToken);

        if (status == SurveyCampaignStatus.Published)
        {
            _ = Task.Run(async () =>
            {
                try
                {
                    using var scope = _serviceProvider.CreateScope();
                    var mediator = Microsoft.Extensions.DependencyInjection.ServiceProviderServiceExtensions.GetRequiredService<IMediator>(scope.ServiceProvider);
                    await mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.ProcessSurveyCampaigns.ProcessSurveyCampaignsCommand());
                }
                catch
                {
                    // Ignore background errors
                }
            });
        }

        return campaign.Id;
    }
}
