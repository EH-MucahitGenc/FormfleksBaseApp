using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetIdentifiedParticipantResponse;

public record GetIdentifiedParticipantResponseQuery(Guid CampaignId, Guid AssignmentId, Guid ActorUserId, bool IsGlobalAdmin)
    : IRequest<IdentifiedParticipantResponseDto>;

public sealed class IdentifiedParticipantResponseDto
{
    public Guid ResponseId { get; set; }
    public Guid AssignmentId { get; set; }
    public Guid UserId { get; set; }
    public string ParticipantName { get; set; } = string.Empty;
    public string ParticipantEmail { get; set; } = string.Empty;
    public string? Company { get; set; }
    public string? Department { get; set; }
    public string? Location { get; set; }
    public string? JobTitle { get; set; }
    public string SnapshotSource { get; set; } = string.Empty;
    public DateTime StartedAt { get; set; }
    public DateTime SubmittedAt { get; set; }
    public double CompletionSeconds { get; set; }
    public List<IdentifiedAnswerDto> Answers { get; set; } = new();
}

public sealed class IdentifiedAnswerDto
{
    public Guid QuestionId { get; set; }
    public string QuestionTitle { get; set; } = string.Empty;
    public short QuestionType { get; set; }
    public bool IsRequired { get; set; }
    public string? TextValue { get; set; }
    public decimal? NumericValue { get; set; }
    public DateTime? DateValue { get; set; }
    public string? JsonValue { get; set; }
    public List<string> SelectedOptions { get; set; } = new();
    public List<string> Files { get; set; } = new();
}

public sealed class GetIdentifiedParticipantResponseQueryHandler
    : IRequestHandler<GetIdentifiedParticipantResponseQuery, IdentifiedParticipantResponseDto>
{
    private readonly ISurveyDbContext _context;

    public GetIdentifiedParticipantResponseQueryHandler(ISurveyDbContext context) => _context = context;

    public async Task<IdentifiedParticipantResponseDto> Handle(GetIdentifiedParticipantResponseQuery request, CancellationToken cancellationToken)
    {
        var campaign = await _context.SurveyCampaigns.AsNoTracking()
            .Where(c => c.Id == request.CampaignId).Select(c => new { c.IsAnonymous })
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new FormfleksBaseApp.Application.Common.NotFoundException("Kampanya bulunamadı.");
            
        if (campaign.IsAnonymous)
            throw new FormfleksBaseApp.Application.Common.BusinessException("Anonim kampanyalarda tekil yanıt görüntülenemez.");

        var hasDetailedAccess = request.IsGlobalAdmin;
        if (!hasDetailedAccess)
        {
            var viewer = await _context.SurveyResultViewers.AsNoTracking()
                .FirstOrDefaultAsync(v => v.SurveyCampaignId == request.CampaignId && v.UserId == request.ActorUserId, cancellationToken);
            hasDetailedAccess = viewer != null && viewer.AccessLevel == FormfleksBaseApp.Domain.Enums.Surveys.SurveyViewerAccessLevel.Detailed;
        }

        if (!hasDetailedAccess)
            throw new FormfleksBaseApp.Application.Common.BusinessException("Kimlikli yanıtları görüntüleme yetkiniz yok (Sadece özet erişiminiz olabilir).");

        var response = await _context.SurveyResponses.AsNoTracking()
            .Include(r => r.SurveyAssignment)
            .Include(r => r.Answers).ThenInclude(a => a.Files)
            .Include(r => r.Answers).ThenInclude(a => a.SurveyVersionQuestion).ThenInclude(q => q.Options)
            .SingleOrDefaultAsync(r => r.SurveyCampaignId == request.CampaignId && r.SurveyAssignmentId == request.AssignmentId, cancellationToken)
            ?? throw new FormfleksBaseApp.Application.Common.NotFoundException("Katılımcı yanıtı bulunamadı.");

        var assignment = response.SurveyAssignment
            ?? throw new FormfleksBaseApp.Application.Common.NotFoundException("Katılımcı ataması bulunamadı.");
        return new IdentifiedParticipantResponseDto
        {
            ResponseId = response.Id,
            AssignmentId = assignment.Id,
            UserId = assignment.UserId,
            ParticipantName = assignment.ParticipantDisplayName,
            ParticipantEmail = assignment.ParticipantEmail,
            Company = assignment.CompanySnapshot,
            Department = assignment.DepartmentSnapshot,
            Location = assignment.LocationSnapshot,
            JobTitle = assignment.JobTitleSnapshot,
            SnapshotSource = assignment.SnapshotSource,
            StartedAt = response.StartedAt,
            SubmittedAt = response.SubmittedAt,
            CompletionSeconds = Math.Round((response.SubmittedAt - response.StartedAt).TotalSeconds, 1),
            Answers = response.Answers.OrderBy(a => a.SurveyVersionQuestion.SortOrder).Select(a => new IdentifiedAnswerDto
            {
                QuestionId = a.SurveyVersionQuestionId,
                QuestionTitle = a.SurveyVersionQuestion.Title,
                QuestionType = (short)a.SurveyVersionQuestion.QuestionType,
                IsRequired = a.SurveyVersionQuestion.IsRequired,
                TextValue = a.ValueText,
                NumericValue = a.ValueNumber,
                DateValue = a.ValueDate,
                JsonValue = a.ValueJson,
                SelectedOptions = ResolveSelectedOptions(a.ValueJson, a.SurveyVersionQuestion.Options.ToDictionary(o => o.Id, o => o.Label)),
                Files = a.Files.Select(f => f.FileName).ToList()
            }).ToList()
        };
    }

    private static List<string> ResolveSelectedOptions(string? json, IReadOnlyDictionary<Guid, string> labels)
    {
        if (string.IsNullOrWhiteSpace(json)) return [];
        try
        {
            return (JsonSerializer.Deserialize<List<Guid>>(json) ?? [])
                .Where(labels.ContainsKey).Select(id => labels[id]).ToList();
        }
        catch (JsonException) { return []; }
    }
}
