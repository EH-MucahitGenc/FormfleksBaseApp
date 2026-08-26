using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetQuestionTextAnswers;

public record GetQuestionTextAnswersQuery(Guid CampaignId, Guid QuestionId, int Page, int PageSize,
    string? Search, Guid ActorUserId, bool IsGlobalAdmin) : IRequest<PagedTextAnswersDto>;

public sealed class PagedTextAnswersDto
{
    public List<TextAnswerItemDto> Items { get; set; } = new();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
    public bool IsAnonymous { get; set; }
    public bool IsSuppressed { get; set; }
    public int MinimumGroupSize { get; set; } = 10;
    public string? SuppressionReason { get; set; }
}

public sealed class TextAnswerItemDto
{
    public Guid AnswerId { get; set; }
    public string Text { get; set; } = string.Empty;
    public DateTime SubmittedAt { get; set; }
    public Guid? UserId { get; set; }
    public string? ParticipantName { get; set; }
    public string? Department { get; set; }
    public string? Location { get; set; }
}

public sealed class GetQuestionTextAnswersQueryHandler : IRequestHandler<GetQuestionTextAnswersQuery, PagedTextAnswersDto>
{
    private const int MinimumAnonymousGroupSize = 10;
    private readonly ISurveyDbContext _context;

    public GetQuestionTextAnswersQueryHandler(ISurveyDbContext context) => _context = context;

    public async Task<PagedTextAnswersDto> Handle(GetQuestionTextAnswersQuery request, CancellationToken cancellationToken)
    {
        var campaign = await _context.SurveyCampaigns.AsNoTracking()
            .Where(c => c.Id == request.CampaignId)
            .Select(c => new { c.IsAnonymous, c.SurveyTemplateVersionId })
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new FormfleksBaseApp.Application.Common.NotFoundException("Kampanya bulunamadı.");

        var currentAccessLevel = await GetAccessLevelAsync(request, cancellationToken);
        var shouldMaskIdentities = campaign.IsAnonymous || currentAccessLevel < (int)FormfleksBaseApp.Domain.Enums.Surveys.SurveyViewerAccessLevel.Detailed;

        var questionExists = await _context.SurveyVersionQuestions.AsNoTracking().AnyAsync(q =>
            q.Id == request.QuestionId &&
            q.SurveyVersionSection.SurveyTemplateVersionId == campaign.SurveyTemplateVersionId &&
            (q.QuestionType == SurveyQuestionType.ShortText || q.QuestionType == SurveyQuestionType.LongText), cancellationToken);
        if (!questionExists)
            throw new FormfleksBaseApp.Application.Common.NotFoundException("Metin sorusu bulunamadı.");

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 10, 100);
        var query = _context.SurveyAnswers.AsNoTracking().Where(a =>
            a.SurveyVersionQuestionId == request.QuestionId &&
            a.SurveyResponse.SurveyCampaignId == request.CampaignId &&
            a.ValueText != null && a.ValueText != string.Empty);
        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();
            var normalizedSearch = search.ToLower();
            query = query.Where(a => a.ValueText!.ToLower().Contains(normalizedSearch));
        }

        var totalCount = await query.CountAsync(cancellationToken);
        if (campaign.IsAnonymous && totalCount < MinimumAnonymousGroupSize)
        {
            return new PagedTextAnswersDto
            {
                TotalCount = 0,
                Page = page,
                PageSize = pageSize,
                IsAnonymous = true,
                IsSuppressed = true,
                SuppressionReason = "Anonimliği korumak için en az 10 metin yanıtı gereklidir."
            };
        }

        var items = await query.OrderByDescending(a => a.SurveyResponse.SubmittedAt)
            .Skip((page - 1) * pageSize).Take(pageSize)
            .Select(a => new TextAnswerItemDto
            {
                AnswerId = a.Id,
                Text = a.ValueText!,
                SubmittedAt = shouldMaskIdentities ? a.SurveyResponse.SubmittedAt.Date : a.SurveyResponse.SubmittedAt,
                UserId = shouldMaskIdentities ? null : a.SurveyResponse.UserId,
                ParticipantName = shouldMaskIdentities ? null : (a.SurveyResponse.SurveyAssignment != null ? a.SurveyResponse.SurveyAssignment.ParticipantDisplayName : null),
                Department = shouldMaskIdentities ? null : (a.SurveyResponse.SurveyAssignment != null ? a.SurveyResponse.SurveyAssignment.DepartmentSnapshot : null),
                Location = shouldMaskIdentities ? null : (a.SurveyResponse.SurveyAssignment != null ? a.SurveyResponse.SurveyAssignment.LocationSnapshot : null)
            }).ToListAsync(cancellationToken);

        if (shouldMaskIdentities)
            foreach (var item in items) item.Text = RedactPotentialPii(item.Text);

        return new PagedTextAnswersDto
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize,
            IsAnonymous = campaign.IsAnonymous
        };
    }

    private async Task<int> GetAccessLevelAsync(GetQuestionTextAnswersQuery request, CancellationToken cancellationToken)
    {
        if (request.IsGlobalAdmin) return (int)FormfleksBaseApp.Domain.Enums.Surveys.SurveyViewerAccessLevel.Detailed;
        var viewer = await _context.SurveyResultViewers.AsNoTracking().FirstOrDefaultAsync(v =>
            v.SurveyCampaignId == request.CampaignId && v.UserId == request.ActorUserId, cancellationToken);
        if (viewer == null) throw new FormfleksBaseApp.Application.Common.BusinessException("Bu anketin sonuçlarını görüntüleme yetkiniz yok.");
        return (int)viewer.AccessLevel;
    }

    private static string RedactPotentialPii(string value)
    {
        value = Regex.Replace(value, @"[\w.+-]+@[\w.-]+\.[A-Za-z]{2,}", "[E-POSTA MASKELENDİ]", RegexOptions.IgnoreCase);
        value = Regex.Replace(value, @"(?<!\d)(?:\+?90\s*)?(?:0?5\d{2})[\s.-]*\d{3}[\s.-]*\d{2}[\s.-]*\d{2}(?!\d)", "[TELEFON MASKELENDİ]");
        return value;
    }
}
