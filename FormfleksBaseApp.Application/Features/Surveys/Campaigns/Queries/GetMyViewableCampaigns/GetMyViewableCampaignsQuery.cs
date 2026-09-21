using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaigns;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetMyViewableCampaigns;

public record GetMyViewableCampaignsQuery(Guid UserId) : IRequest<List<CampaignListDto>>;

public class GetMyViewableCampaignsQueryHandler : IRequestHandler<GetMyViewableCampaignsQuery, List<CampaignListDto>>
{
    private readonly ISurveyDbContext _context;

    private readonly FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAuthorizationService _authService;
    
    public GetMyViewableCampaignsQueryHandler(ISurveyDbContext context, FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAuthorizationService authService)
    {
        _context = context;
        _authService = authService;
    }

    public async Task<List<CampaignListDto>> Handle(GetMyViewableCampaignsQuery request, CancellationToken cancellationToken)
    {
        if (!await _authService.IsActiveUserAsync(request.UserId, cancellationToken)) return new List<CampaignListDto>();

        var now = DateTime.UtcNow;
        var campaigns = await _context.SurveyCampaigns.AsNoTracking()
            .Where(FormfleksBaseApp.Application.Features.Surveys.Common.SurveyResultAccess.VisibleTo(request.UserId, now))
            .OrderByDescending(c => c.StartDate)
            .Select(c => new CampaignListDto(
                c.Id,
                c.Title,
                c.Description,
                c.IsAnonymous,
                c.Status.ToString(),
                (int)c.Status,
                c.StartDate,
                c.EndDate,
                c.Assignments.Count,
                c.Responses.Count
            ))
            .ToListAsync(cancellationToken);

        return campaigns;
    }
}
