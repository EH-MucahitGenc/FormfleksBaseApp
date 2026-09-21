using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.Surveys.Common;

public record SurveyNavigationDto(bool CanDesign, bool CanPublish, bool CanManage, bool CanViewResults);
public record GetSurveyNavigationQuery(Guid UserId) : IRequest<SurveyNavigationDto>;

public class GetSurveyNavigationQueryHandler(ISurveyDbContext context, ISurveyAuthorizationService auth)
    : IRequestHandler<GetSurveyNavigationQuery, SurveyNavigationDto>
{
    public async Task<SurveyNavigationDto> Handle(GetSurveyNavigationQuery request, CancellationToken ct)
    {
        if (!await auth.IsActiveUserAsync(request.UserId, ct)) return new(false, false, false, false);
        return new(
            await auth.HasGlobalPermissionAsync(request.UserId, SurveyAction.DesignTemplate, ct),
            await auth.HasGlobalPermissionAsync(request.UserId, SurveyAction.PublishCampaign, ct),
            await auth.HasGlobalPermissionAsync(request.UserId, SurveyAction.ManageCampaign, ct),
            await context.SurveyCampaigns.AsNoTracking().AnyAsync(SurveyResultAccess.VisibleTo(request.UserId, DateTime.UtcNow), ct));
    }
}
