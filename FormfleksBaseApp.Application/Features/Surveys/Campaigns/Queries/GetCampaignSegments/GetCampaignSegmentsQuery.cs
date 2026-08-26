using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignSegments;

public record GetCampaignSegmentsQuery(Guid CampaignId, string Dimension, Guid ActorUserId, bool IsGlobalAdmin)
    : IRequest<CampaignSegmentsDto>;

public sealed class CampaignSegmentsDto
{
    public string Dimension { get; set; } = string.Empty;
    public bool IsAnonymous { get; set; }
    public int MinimumGroupSize { get; set; } = 10;
    public List<CampaignSegmentItemDto> Items { get; set; } = new();
}

public sealed class CampaignSegmentItemDto
{
    public string Label { get; set; } = string.Empty;
    public int? Participants { get; set; }
    public int? Responses { get; set; }
    public double? ResponseRate { get; set; }
    public bool IsSuppressed { get; set; }
}

public sealed class GetCampaignSegmentsQueryHandler : IRequestHandler<GetCampaignSegmentsQuery, CampaignSegmentsDto>
{
    private const int MinimumAnonymousGroupSize = 10;
    private readonly ISurveyDbContext _context;

    public GetCampaignSegmentsQueryHandler(ISurveyDbContext context) => _context = context;

    public async Task<CampaignSegmentsDto> Handle(GetCampaignSegmentsQuery request, CancellationToken cancellationToken)
    {
        var isAnonymous = await _context.SurveyCampaigns.AsNoTracking()
            .Where(c => c.Id == request.CampaignId).Select(c => (bool?)c.IsAnonymous)
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new FormfleksBaseApp.Application.Common.NotFoundException("Kampanya bulunamadı.");
        await EnsureAccessAsync(request, cancellationToken);

        var dimension = request.Dimension.Trim().ToLowerInvariant();
        if (dimension is not ("company" or "location" or "department" or "title" or "personnelgroup"))
            throw new FormfleksBaseApp.Application.Common.BusinessException("Desteklenmeyen segment boyutu.");

        var assignments = _context.SurveyAssignments.AsNoTracking().Where(a => a.SurveyCampaignId == request.CampaignId);
        var grouped = dimension switch
        {
            "company" => assignments.GroupBy(a => a.CompanySnapshot ?? "Belirtilmemiş").Select(g => new SegmentProjection { Label = g.Key, Participants = g.Count(), Responses = g.Count(a => a.CompletedAt != null) }),
            "location" => assignments.GroupBy(a => a.LocationSnapshot ?? "Belirtilmemiş").Select(g => new SegmentProjection { Label = g.Key, Participants = g.Count(), Responses = g.Count(a => a.CompletedAt != null) }),
            "department" => assignments.GroupBy(a => a.DepartmentSnapshot ?? "Belirtilmemiş").Select(g => new SegmentProjection { Label = g.Key, Participants = g.Count(), Responses = g.Count(a => a.CompletedAt != null) }),
            "title" => assignments.GroupBy(a => a.JobTitleSnapshot ?? "Belirtilmemiş").Select(g => new SegmentProjection { Label = g.Key, Participants = g.Count(), Responses = g.Count(a => a.CompletedAt != null) }),
            _ => assignments.GroupBy(a => a.PersonnelGroupSnapshot ?? "Belirtilmemiş").Select(g => new SegmentProjection { Label = g.Key, Participants = g.Count(), Responses = g.Count(a => a.CompletedAt != null) })
        };

        var rows = await grouped.OrderByDescending(x => x.Participants).ThenBy(x => x.Label).ToListAsync(cancellationToken);
        return new CampaignSegmentsDto
        {
            Dimension = dimension,
            IsAnonymous = isAnonymous,
            Items = rows.Select(row =>
            {
                var suppressed = isAnonymous && row.Responses < MinimumAnonymousGroupSize;
                return new CampaignSegmentItemDto
                {
                    Label = row.Label,
                    Participants = suppressed ? null : row.Participants,
                    Responses = suppressed ? null : row.Responses,
                    ResponseRate = suppressed ? null : Math.Round((double)row.Responses / row.Participants * 100, 1),
                    IsSuppressed = suppressed
                };
            }).ToList()
        };
    }

    private async Task EnsureAccessAsync(GetCampaignSegmentsQuery request, CancellationToken cancellationToken)
    {
        if (request.IsGlobalAdmin) return;
        var allowed = await _context.SurveyResultViewers.AsNoTracking().AnyAsync(v =>
            v.SurveyCampaignId == request.CampaignId && v.UserId == request.ActorUserId, cancellationToken);
        if (!allowed) throw new FormfleksBaseApp.Application.Common.BusinessException("Bu anketin sonuçlarını görüntüleme yetkiniz yok.");
    }

    private sealed class SegmentProjection
    {
        public string Label { get; set; } = string.Empty;
        public int Participants { get; set; }
        public int Responses { get; set; }
    }
}
