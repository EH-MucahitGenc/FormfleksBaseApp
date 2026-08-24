using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignResults;

public record GetCampaignResultsQuery(Guid CampaignId, Guid ActorUserId, bool IsGlobalAdmin) : IRequest<CampaignResultsDto>;

public class CampaignResultsDto
{
    public Guid CampaignId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int TotalParticipants { get; set; }
    public int TotalResponses { get; set; }
    public double ResponseRate => TotalParticipants == 0 ? 0 : Math.Round((double)TotalResponses / TotalParticipants * 100, 1);
    public List<QuestionStatsDto> Questions { get; set; } = new();
}

public class QuestionStatsDto
{
    public Guid QuestionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public SurveyQuestionType Type { get; set; }
    public int TotalAnswers { get; set; }
    public List<OptionStatDto> OptionStats { get; set; } = new();
    public List<string> TextAnswers { get; set; } = new(); // Son 10 metin cevabı vs.
}

public class OptionStatDto
{
    public Guid OptionId { get; set; }
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Percentage { get; set; }
}

public class GetCampaignResultsQueryHandler : IRequestHandler<GetCampaignResultsQuery, CampaignResultsDto>
{
    private readonly ISurveyDbContext _context;
    private readonly IDynamicFormsDbContext _dynamicFormsContext;

    public GetCampaignResultsQueryHandler(ISurveyDbContext context, IDynamicFormsDbContext dynamicFormsContext)
    {
        _context = context;
        _dynamicFormsContext = dynamicFormsContext;
    }

    public async Task<CampaignResultsDto> Handle(GetCampaignResultsQuery request, CancellationToken cancellationToken)
    {
        var campaign = await _context.SurveyCampaigns
            .Include(c => c.SurveyTemplateVersion)
                .ThenInclude(v => v.Sections)
                    .ThenInclude(s => s.Questions)
                        .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);

        if (campaign == null)
            throw new FormfleksBaseApp.Application.Common.BusinessException("Kampanya bulunamadı.");

        if (!request.IsGlobalAdmin)
        {
            var isViewer = await _context.SurveyResultViewers.AnyAsync(v => v.SurveyCampaignId == request.CampaignId && v.UserId == request.ActorUserId, cancellationToken);
            if (!isViewer)
                throw new FormfleksBaseApp.Application.Common.BusinessException("Bu anketin sonuçlarını görüntüleme yetkiniz yok.");
        }

        var totalParticipants = await _context.SurveyAssignments.CountAsync(a => a.SurveyCampaignId == request.CampaignId, cancellationToken);
        var totalResponsesCount = await _context.SurveyResponses.CountAsync(r => r.SurveyCampaignId == request.CampaignId, cancellationToken);
        
        var dto = new CampaignResultsDto
        {
            CampaignId = campaign.Id,
            Title = campaign.Title,
            TotalParticipants = totalParticipants,
            TotalResponses = totalResponsesCount
        };

        var questions = campaign.SurveyTemplateVersion.Sections.SelectMany(s => s.Questions).OrderBy(q => q.SortOrder).ToList();

        var allAnswers = await _context.SurveyAnswers
            .Where(a => a.SurveyResponse.SurveyCampaignId == request.CampaignId)
            .Select(a => new { a.SurveyVersionQuestionId, a.ValueText, a.ValueNumber, a.ValueJson, a.SurveyResponse.SubmittedAt, a.SurveyResponse.UserId, Files = a.Files.Select(f => f.FileName).ToList() })
            .ToListAsync(cancellationToken);
            
        var userIds = allAnswers.Where(a => a.UserId.HasValue).Select(a => a.UserId!.Value).Distinct().ToList();
        var userDict = new Dictionary<Guid, string>();
        if (userIds.Any() && !campaign.IsAnonymous)
        {
            userDict = await _dynamicFormsContext.QdmsPersoneller
                .AsNoTracking()
                .Where(u => u.LinkedUserId != null && userIds.Contains(u.LinkedUserId.Value))
                .ToDictionaryAsync(u => u.LinkedUserId!.Value, u => u.Adi + " " + u.Soyadi, cancellationToken);
        }
        
        foreach (var q in questions)
        {
            var qAnswers = allAnswers.Where(x => x.SurveyVersionQuestionId == q.Id).ToList();
            var answeredCount = qAnswers.Count;

            var qStats = new QuestionStatsDto
            {
                QuestionId = q.Id,
                Title = q.Title,
                Type = q.QuestionType,
                TotalAnswers = answeredCount
            };

            if (q.QuestionType == SurveyQuestionType.SingleChoice || q.QuestionType == SurveyQuestionType.MultipleChoice)
            {
                var selectedOptionIds = new List<Guid>();
                foreach (var ans in qAnswers.Where(a => !string.IsNullOrEmpty(a.ValueJson)))
                {
                    try
                    {
                        var ids = JsonSerializer.Deserialize<List<Guid>>(ans.ValueJson!);
                        if (ids != null) selectedOptionIds.AddRange(ids);
                    }
                    catch { }
                }

                foreach (var opt in q.Options.OrderBy(o => o.SortOrder))
                {
                    var count = selectedOptionIds.Count(id => id == opt.Id);
                    qStats.OptionStats.Add(new OptionStatDto
                    {
                        OptionId = opt.Id,
                        Label = opt.Label,
                        Count = count,
                        Percentage = answeredCount == 0 ? 0 : Math.Round((double)count / answeredCount * 100, 1)
                    });
                }
            }
            else if (q.QuestionType == SurveyQuestionType.YesNo)
            {
                var yesCount = qAnswers.Count(x => x.ValueText == "true");
                var noCount = qAnswers.Count(x => x.ValueText == "false");
                
                qStats.OptionStats.Add(new OptionStatDto { OptionId = Guid.NewGuid(), Label = "Evet", Count = yesCount, Percentage = answeredCount == 0 ? 0 : Math.Round((double)yesCount / answeredCount * 100, 1) });
                qStats.OptionStats.Add(new OptionStatDto { OptionId = Guid.NewGuid(), Label = "Hayır", Count = noCount, Percentage = answeredCount == 0 ? 0 : Math.Round((double)noCount / answeredCount * 100, 1) });
            }
            else if (q.QuestionType == SurveyQuestionType.Rating || q.QuestionType == SurveyQuestionType.NPS)
            {
                var grouped = qAnswers.Where(x => x.ValueNumber.HasValue)
                                      .GroupBy(x => x.ValueNumber!.Value)
                                      .OrderBy(g => g.Key);
                foreach (var g in grouped)
                {
                    var labelValue = g.Key % 1 == 0 ? ((int)g.Key).ToString() : g.Key.ToString("0.##");
                    qStats.OptionStats.Add(new OptionStatDto { OptionId = Guid.NewGuid(), Label = labelValue, Count = g.Count(), Percentage = answeredCount == 0 ? 0 : Math.Round((double)g.Count() / answeredCount * 100, 1) });
                }
            }
            else
            {
                // Fallback for ShortText, LongText, Number, Date, File, Matrix: show latest 25 answers
                qStats.TextAnswers = qAnswers
                    .Where(a => !string.IsNullOrWhiteSpace(a.ValueText) || a.ValueNumber.HasValue || !string.IsNullOrWhiteSpace(a.ValueJson) || (a.Files != null && a.Files.Count > 0))
                    .OrderByDescending(a => a.SubmittedAt)
                    .Take(25)
                    .Select(a => 
                    {
                        string prefix = "";
                        if (!campaign.IsAnonymous && a.UserId.HasValue)
                        {
                            prefix = userDict.GetValueOrDefault(a.UserId.Value, "Bilinmeyen Kullanıcı") + ": ";
                        }

                        if (q.QuestionType == SurveyQuestionType.File)
                            return prefix + string.Join(", ", a.Files);
                            
                        if (q.QuestionType == SurveyQuestionType.Matrix && !string.IsNullOrWhiteSpace(a.ValueJson) && !string.IsNullOrWhiteSpace(q.SettingsJson))
                        {
                            try
                            {
                                using var valDoc = JsonDocument.Parse(a.ValueJson);
                                using var setDoc = JsonDocument.Parse(q.SettingsJson);
                                
                                var rows = setDoc.RootElement.TryGetProperty("rows", out var rProp) && rProp.ValueKind == JsonValueKind.Array ? rProp.EnumerateArray().Select(x => x.GetString() ?? "").ToArray() : Array.Empty<string>();
                                var cols = setDoc.RootElement.TryGetProperty("cols", out var cProp) && cProp.ValueKind == JsonValueKind.Array ? cProp.EnumerateArray().Select(x => x.GetString() ?? "").ToArray() : Array.Empty<string>();
                                
                                var parts = new List<string>();
                                foreach (var prop in valDoc.RootElement.EnumerateObject())
                                {
                                    if (int.TryParse(prop.Name, out int rIdx) && prop.Value.TryGetInt32(out int cIdx))
                                    {
                                        string rowLabel = rIdx >= 0 && rIdx < rows.Length ? rows[rIdx] : $"Satır {rIdx + 1}";
                                        string colLabel = cIdx >= 0 && cIdx < cols.Length ? cols[cIdx] : $"Sütun {cIdx + 1}";
                                        parts.Add($"{rowLabel}: {colLabel}");
                                    }
                                }
                                return prefix + string.Join(" | ", parts);
                            }
                            catch { return prefix + (a.ValueJson ?? ""); }
                        }

                        if (!string.IsNullOrWhiteSpace(a.ValueText))
                            return prefix + a.ValueText;
                        if (a.ValueNumber.HasValue)
                        {
                            var numStr = a.ValueNumber.Value % 1 == 0 ? ((long)a.ValueNumber.Value).ToString() : a.ValueNumber.Value.ToString("0.##");
                            return prefix + numStr;
                        }
                        return prefix + (a.ValueJson ?? "");
                    })
                    .ToList();
            }

            dto.Questions.Add(qStats);
        }

        return dto;
    }
}
