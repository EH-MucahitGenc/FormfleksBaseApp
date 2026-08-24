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

    public GetMyViewableCampaignsQueryHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<List<CampaignListDto>> Handle(GetMyViewableCampaignsQuery request, CancellationToken cancellationToken)
    {
        var campaigns = await _context.SurveyResultViewers
            .Where(v => v.UserId == request.UserId)
            .Select(v => v.SurveyCampaign)
            .OrderByDescending(c => c.StartDate)
            .Select(c => new CampaignListDto(
                c.Id,
                c.Title,
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
