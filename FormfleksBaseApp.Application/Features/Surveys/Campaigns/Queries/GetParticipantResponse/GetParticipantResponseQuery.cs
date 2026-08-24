using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using System.Collections.Generic;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetParticipantResponse;

public record GetParticipantResponseQuery(Guid CampaignId, Guid? AssignmentId, string? ReceiptCode, Guid ActorUserId, bool IsGlobalAdmin) : IRequest<ParticipantResponseDto>;

public class ParticipantResponseDto
{
    public Guid ResponseId { get; set; }
    public Guid? UserId { get; set; }
    public DateTime SubmittedAt { get; set; }
    public string? ReceiptCode { get; set; }
    public string ConfigurationJson { get; set; } = string.Empty;
    public Dictionary<Guid, ParticipantAnswerDto> Answers { get; set; } = new();
}

public class ParticipantAnswerDto
{
    public string? TextValue { get; set; }
    public decimal? NumericValue { get; set; }
    public List<Guid>? SelectedOptionIds { get; set; }
}

public class GetParticipantResponseQueryHandler : IRequestHandler<GetParticipantResponseQuery, ParticipantResponseDto>
{
    private readonly ISurveyDbContext _context;

    public GetParticipantResponseQueryHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<ParticipantResponseDto> Handle(GetParticipantResponseQuery request, CancellationToken cancellationToken)
    {
        if (!request.IsGlobalAdmin)
        {
            var isViewer = await _context.SurveyResultViewers.AnyAsync(v => v.SurveyCampaignId == request.CampaignId && v.UserId == request.ActorUserId, cancellationToken);
            if (!isViewer)
                throw new FormfleksBaseApp.Application.Common.BusinessException("Bu anketin sonuçlarýný görüntüleme yetkiniz yok.");
        }

        var query = _context.SurveyResponses
            .Include(r => r.SurveyCampaign)
                .ThenInclude(c => c.SurveyTemplateVersion)
                    .ThenInclude(tv => tv.Sections.OrderBy(s => s.SortOrder))
                        .ThenInclude(s => s.Questions.OrderBy(q => q.SortOrder))
                            .ThenInclude(q => q.Options.OrderBy(o => o.SortOrder))
            .Include(r => r.Answers)
            .Where(r => r.SurveyCampaignId == request.CampaignId);

        if (request.AssignmentId.HasValue)
            query = query.Where(r => r.SurveyAssignmentId == request.AssignmentId.Value);
        else if (!string.IsNullOrEmpty(request.ReceiptCode))
            query = query.Where(r => r.ReceiptCode == request.ReceiptCode);
        else
            throw new FormfleksBaseApp.Application.Common.BusinessException("Katýlýmcý ID veya Makbuz Kodu gereklidir.");

        var response = await query.FirstOrDefaultAsync(cancellationToken);

        if (response == null)
            throw new FormfleksBaseApp.Application.Common.NotFoundException("Yanýt bulunamadý.");

        var configurationJson = System.Text.Json.JsonSerializer.Serialize(response.SurveyCampaign.SurveyTemplateVersion.Sections.Select(s => new {
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

        var answersDict = new Dictionary<Guid, ParticipantAnswerDto>();
        foreach (var ans in response.Answers)
        {
            List<Guid>? selectedIds = null;
            if (!string.IsNullOrEmpty(ans.ValueJson))
            {
                try { selectedIds = System.Text.Json.JsonSerializer.Deserialize<List<Guid>>(ans.ValueJson); } catch { }
            }
            
            var dto = new ParticipantAnswerDto
            {
                TextValue = ans.ValueText,
                NumericValue = ans.ValueNumber,
                SelectedOptionIds = selectedIds
            };
            answersDict[ans.SurveyVersionQuestionId] = dto;
        }

        return new ParticipantResponseDto
        {
            ResponseId = response.Id,
            UserId = response.UserId,
            SubmittedAt = response.SubmittedAt,
            ReceiptCode = response.ReceiptCode,
            ConfigurationJson = configurationJson,
            Answers = answersDict
        };
    }
}
