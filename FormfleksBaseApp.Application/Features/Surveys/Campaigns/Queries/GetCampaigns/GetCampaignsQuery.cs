using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaigns;

public record CampaignListDto(
    Guid Id,
    string Title,
    string Status,
    int StatusValue,
    DateTime? StartDate,
    DateTime? EndDate,
    int TotalParticipants,
    int TotalResponses
);

public record GetCampaignsQuery() : IRequest<List<CampaignListDto>>;

public class GetCampaignsQueryHandler : IRequestHandler<GetCampaignsQuery, List<CampaignListDto>>
{
    private readonly ISurveyDbContext _context;

    public GetCampaignsQueryHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<List<CampaignListDto>> Handle(GetCampaignsQuery request, CancellationToken cancellationToken)
    {
        var campaigns = await _context.SurveyCampaigns
            .OrderByDescending(c => c.StartDate ?? DateTime.MaxValue)
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
