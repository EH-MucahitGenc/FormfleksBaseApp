using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Participants.Queries.GetSurveyByToken;

public record GetSurveyByTokenQuery(Guid Token) : IRequest<SurveyFillDto>;

public class SurveyFillDto
{
    public Guid CampaignId { get; set; }
    public string CampaignTitle { get; set; } = string.Empty;
    public bool IsAnonymous { get; set; }
    public string ConfigurationJson { get; set; } = string.Empty;
}

public class GetSurveyByTokenQueryHandler : IRequestHandler<GetSurveyByTokenQuery, SurveyFillDto>
{
    private readonly ISurveyDbContext _context;

    public GetSurveyByTokenQueryHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<SurveyFillDto> Handle(GetSurveyByTokenQuery request, CancellationToken cancellationToken)
    {
        var assignment = await _context.SurveyAssignments
            .Include(a => a.SurveyCampaign)
                .ThenInclude(c => c.SurveyTemplateVersion)
                    .ThenInclude(tv => tv.Sections.OrderBy(s => s.SortOrder))
                        .ThenInclude(s => s.Questions.OrderBy(q => q.SortOrder))
                            .ThenInclude(q => q.Options.OrderBy(o => o.SortOrder))
            .FirstOrDefaultAsync(a => a.Token == request.Token, cancellationToken);

        if (assignment == null)
            throw new FormfleksBaseApp.Application.Common.NotFoundException("Geçersiz veya süresi dolmuş bağlantı.");

        if (assignment.SurveyCampaign.Status != SurveyCampaignStatus.Published)
            throw new FormfleksBaseApp.Application.Common.GoneException("Bu anket şu anda aktif değil (süresi dolmuş veya iptal edilmiş olabilir).");
            
        var now = DateTime.UtcNow;
        if (assignment.SurveyCampaign.StartDate > now)
            throw new FormfleksBaseApp.Application.Common.GoneException("Bu anketin başlangıç tarihi henüz gelmemiştir.");
            
        if (assignment.SurveyCampaign.EndDate.HasValue && assignment.SurveyCampaign.EndDate.Value < now)
            throw new FormfleksBaseApp.Application.Common.GoneException("Bu anketin süresi dolmuştur.");
            
        if (assignment.Status == SurveyAssignmentStatus.Completed)
            throw new FormfleksBaseApp.Application.Common.ConflictException("Bu anketi zaten doldurdunuz.");

        // Status is no longer updated to Started here on GET, to preserve REST principles.
        // It will remain Sent/Pending until submitted.

        // ConfigurationJson as a dynamic serialization of sections for the frontend engine
        var configurationJson = System.Text.Json.JsonSerializer.Serialize(assignment.SurveyCampaign.SurveyTemplateVersion.Sections.Select(s => new {
            Id = s.Id,
            Title = s.Title,
            Description = s.Description,
            SortOrder = s.SortOrder,
            Questions = s.Questions.Select(q => new {
                Id = q.Id,
                Title = q.Title,
                Description = q.Description,
                Type = q.QuestionType,
                IsRequired = q.IsRequired,
                SortOrder = q.SortOrder,
                SettingsJson = q.SettingsJson,
                VisibilityRuleJson = q.VisibilityRuleJson,
                Options = q.Options.Select(o => new {
                    Id = o.Id,
                    Text = o.Label,
                    SortOrder = o.SortOrder
                }).ToList()
            }).ToList()
        }));

        return new SurveyFillDto
        {
            CampaignId = assignment.SurveyCampaignId,
            CampaignTitle = assignment.SurveyCampaign.Title,
            IsAnonymous = assignment.SurveyCampaign.IsAnonymous,
            ConfigurationJson = configurationJson
        };
    }
}
