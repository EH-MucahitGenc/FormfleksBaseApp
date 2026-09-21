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
    bool SaveAsDraft, // If true, status=Draft. Else, Published/Scheduled based on StartDate.
    Guid ActorUserId,
    int? ExpectedAudienceCount = null
) : IRequest<Guid>;

public record CampaignViewerDto(Guid UserId, FormfleksBaseApp.Domain.Enums.Surveys.SurveyViewerAccessLevel AccessLevel);

public class CreateCampaignCommandHandler : IRequestHandler<CreateCampaignCommand, Guid>
{
    private readonly ISurveyDbContext _context;
    private readonly IServiceProvider _serviceProvider;
    private readonly FormfleksBaseApp.Application.Common.Interfaces.IDynamicFormsDbContext _dynamicFormsDb;
    private readonly FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAudienceDirectory _audienceDirectory;

    public CreateCampaignCommandHandler(
        ISurveyDbContext context, 
        IServiceProvider serviceProvider, 
        FormfleksBaseApp.Application.Common.Interfaces.IDynamicFormsDbContext dynamicFormsDb,
        FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAudienceDirectory audienceDirectory)
    {
        _context = context;
        _serviceProvider = serviceProvider;
        _dynamicFormsDb = dynamicFormsDb;
        _audienceDirectory = audienceDirectory;
    }

    public async Task<Guid> Handle(CreateCampaignCommand request, CancellationToken cancellationToken)
    {
        if (request.ActorUserId == Guid.Empty)
            throw new FormfleksBaseApp.Application.Common.BusinessException("Kampanyayı oluşturan kullanıcı belirlenemedi. Lütfen yeniden giriş yapın.");
        if (request.AudienceDefinition == null)
            throw new FormfleksBaseApp.Application.Common.BusinessException("Hedef kitle tanımı zorunludur.");
        if (!request.SaveAsDraft)
        {
            var actualCount = await _audienceDirectory.GetTotalUsersCountAsync(request.AudienceDefinition, cancellationToken);
            if (actualCount == 0)
                throw new FormfleksBaseApp.Application.Common.BusinessException("Yayınlamak için en az bir aktif kullanıcı seçin.");
            if (request.ExpectedAudienceCount.HasValue && actualCount != request.ExpectedAudienceCount.Value)
            {
                throw new FormfleksBaseApp.Application.Common.BusinessException($"Seçilen hedef kitle önizlemedeki sayıyla eşleşmiyor (Beklenen: {request.ExpectedAudienceCount.Value}, Bulunan: {actualCount}). Filtreler arka planda değişmiş olabilir. Lütfen işlemi yenileyin.");
            }
        }

        if (request.Viewers?.Count > 0)
        {
            var viewerIds = request.Viewers.Select(v => v.UserId).Distinct().ToList();
            var activeViewers = await _audienceDirectory.GetUsersByIdsAsync(viewerIds, cancellationToken);
            if (activeViewers.Count != viewerIds.Count)
                throw new FormfleksBaseApp.Application.Common.BusinessException("Sonuç izleyicileri aktif sistem kullanıcıları olmalıdır.");
        }

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
            TargetAudienceJson = targetAudienceJson,
            OwnerUserId = request.ActorUserId,
            CreatedByUserId = request.ActorUserId
        };

        _context.SurveyCampaigns.Add(campaign);

        if (request.Viewers != null)
        {
            // Deterministik kural: Aynı kullanıcı birden fazla gelirse, en yüksek yetkiyi (Detailed) seç.
            var groupedViewers = request.Viewers
                .GroupBy(v => v.UserId)
                .Select(g => g.OrderByDescending(v => v.AccessLevel).First());

            foreach (var viewerDto in groupedViewers)
            {
                var viewer = new SurveyResultViewer
                {
                    Id = Guid.NewGuid(),
                    SurveyCampaignId = campaign.Id,
                    UserId = viewerDto.UserId,
                    AccessLevel = viewerDto.AccessLevel,
                    GrantedByUserId = request.ActorUserId,
                    GrantedAt = DateTime.UtcNow,
                    ValidFrom = DateTime.UtcNow
                };
                _context.SurveyResultViewers.Add(viewer);
                
                _dynamicFormsDb.AuditLogs.Add(new FormfleksBaseApp.Domain.Entities.DynamicForms.AuditLogEntity
                {
                    Id = Guid.NewGuid(),
                    EntityType = "SurveyCampaign",
                    EntityId = campaign.Id,
                    ActionType = "CampaignAccessGranted",
                    ActorUserId = request.ActorUserId,
                    DetailJson = System.Text.Json.JsonSerializer.Serialize(new { 
                        ViewerUserId = viewerDto.UserId,
                        AccessLevel = viewerDto.AccessLevel.ToString()
                    }),
                    CreatedAt = DateTime.UtcNow
                });
            }
        }
        
        // 1. Save Campaign first
        await _context.SaveChangesAsync(cancellationToken);

        // 2. Save Audits safely
        try
        {
            await _dynamicFormsDb.SaveChangesAsync(cancellationToken);
        }
        catch (Exception)
        {
            // Log this to generic logger ideally, but don't fail the campaign creation.
        }

        // Background processing is now fully handled by SurveyEmailBackgroundJob cron/hosted service.
        // We do not use Task.Run here to avoid losing tasks if the app domain unloads.
        
        return campaign.Id;
    }
}
