using System;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace FormfleksBaseApp.Application.Features.Surveys.Common;

public class SurveyAuthorizationService : ISurveyAuthorizationService
{
    private readonly ISurveyDbContext _context;
    private readonly ICurrentUserService _currentUserService;
    private readonly FormfleksBaseApp.Application.Auth.Interfaces.IUserRepository _users;

    public SurveyAuthorizationService(
        ISurveyDbContext context, 
        ICurrentUserService currentUserService,
        FormfleksBaseApp.Application.Auth.Interfaces.IUserRepository users)
    {
        _context = context;
        _currentUserService = currentUserService;
        _users = users;
    }

    public async Task<bool> IsActiveUserAsync(Guid userId, CancellationToken cancellationToken = default) =>
        userId != Guid.Empty && userId == _currentUserService.UserId &&
        (await _users.GetByIdAsync(userId, cancellationToken, false))?.Active == true;

    public Task<bool> HasGlobalPermissionAsync(Guid userId, SurveyAction action, CancellationToken cancellationToken = default)
    {
        if (userId != _currentUserService.UserId)
            return Task.FromResult(false);

        string? permissionString = action switch
        {
            SurveyAction.DesignTemplate => FormfleksBaseApp.Domain.Constants.AppPermissions.SurveysDesign,
            SurveyAction.PublishCampaign => FormfleksBaseApp.Domain.Constants.AppPermissions.SurveysPublish,
            SurveyAction.ManageCampaign => FormfleksBaseApp.Domain.Constants.AppPermissions.SurveysManage,
            SurveyAction.ManageAudience => FormfleksBaseApp.Domain.Constants.AppPermissions.SurveysManage,
            SurveyAction.ManageDelivery => FormfleksBaseApp.Domain.Constants.AppPermissions.SurveysManage,
            SurveyAction.ManageCampaignAccess => FormfleksBaseApp.Domain.Constants.AppPermissions.SurveysManage,
            SurveyAction.ExportAggregateResults => FormfleksBaseApp.Domain.Constants.AppPermissions.SurveysResultsExport,
            SurveyAction.ExportIdentifiedResponses => FormfleksBaseApp.Domain.Constants.AppPermissions.SurveysResultsExportIdentified,
            SurveyAction.ViewResponseFiles => FormfleksBaseApp.Domain.Constants.AppPermissions.SurveysResultsViewFiles,
            _ => null
        };

        if (permissionString == null)
            return Task.FromResult(false);

        return Task.FromResult(_currentUserService.HasPermission(permissionString));
    }

    public async Task<bool> HasCampaignPermissionAsync(Guid userId, Guid campaignId, SurveyAction action, CancellationToken cancellationToken = default)
    {
        if (!await IsActiveUserAsync(userId, cancellationToken)) return false;
        // 1. Kampanya bağımsız global operasyonel yönetim kontrolleri:
        if (action == SurveyAction.ManageCampaign ||
            action == SurveyAction.ManageAudience ||
            action == SurveyAction.ManageDelivery ||
            action == SurveyAction.ManageCampaignAccess)
        {
            if (await HasGlobalPermissionAsync(userId, SurveyAction.ManageCampaign, cancellationToken))
                return true;
        }

        if (action == SurveyAction.PublishCampaign)
        {
            if (await HasGlobalPermissionAsync(userId, SurveyAction.PublishCampaign, cancellationToken))
                return true;
        }

        // 2. Kampanya kaydını al (anonimlik vb. kontrol için)
        var campaign = await _context.SurveyCampaigns.AsNoTracking()
            .FirstOrDefaultAsync(c => c.Id == campaignId, cancellationToken);

        if (campaign == null)
            return false;

        // Audience administration does not grant access to survey answers.
        if (action == SurveyAction.ManageAudience && campaign.OwnerUserId == userId)
            return await HasGlobalPermissionAsync(userId, SurveyAction.PublishCampaign, cancellationToken);

        // 3. SurveyResultViewer (İzleyici) Yetki Kontrolü
        var viewer = await _context.SurveyResultViewers.AsNoTracking()
            .FirstOrDefaultAsync(v => v.SurveyCampaignId == campaignId && v.UserId == userId, cancellationToken);

        // An explicit revoked grant also overrides implicit creator/owner access.
        if (viewer == null && (campaign.OwnerUserId == userId || campaign.CreatedByUserId == userId))
        {
            if (action == SurveyAction.ViewAggregateResults) return true;
            if (action == SurveyAction.ExportAggregateResults)
                return await HasGlobalPermissionAsync(userId, action, cancellationToken);
        }

        if (viewer != null)
            {
            // Süre kısıtı var mı?
            var now = DateTime.UtcNow;
            if (!viewer.Active) return false;
            if (viewer.RevokedAt.HasValue && viewer.RevokedAt <= now) return false;
            if (viewer.ValidFrom.HasValue && viewer.ValidFrom > now) return false;
            if (viewer.ValidUntil.HasValue && viewer.ValidUntil < now) return false;

            if (action == SurveyAction.ViewAggregateResults)
            {
                return true;
            }
            if (action == SurveyAction.ExportAggregateResults)
            {
                return await HasGlobalPermissionAsync(userId, SurveyAction.ExportAggregateResults, cancellationToken);
            }

            if (viewer.AccessLevel == SurveyViewerAccessLevel.Detailed)
            {
                if (action == SurveyAction.ViewTextAnswers)
                {
                    return true;
                }

                if (action == SurveyAction.ViewIdentifiedResponses)
                {
                    if (campaign.IsAnonymous) return false;
                    return true;
                }

                if (action == SurveyAction.ExportIdentifiedResponses)
                {
                    if (campaign.IsAnonymous) return false;
                    return await HasGlobalPermissionAsync(userId, SurveyAction.ExportIdentifiedResponses, cancellationToken);
                }
                
                if (action == SurveyAction.ViewResponseFiles)
                {
                    return await HasGlobalPermissionAsync(userId, SurveyAction.ViewResponseFiles, cancellationToken);
                }
            }
        }

        return false;
    }

    public async Task EnsureCampaignPermissionAsync(Guid userId, Guid campaignId, SurveyAction action, CancellationToken cancellationToken = default)
    {
        if (!await HasCampaignPermissionAsync(userId, campaignId, action, cancellationToken))
        {
            throw new FormfleksBaseApp.Application.Common.BusinessException("Bu işlem için yetkiniz bulunmamaktadır.");
        }
    }
}
