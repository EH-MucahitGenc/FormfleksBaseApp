using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.Surveys.Common;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignResults;

public record GetCampaignResultsQuery(Guid CampaignId, Guid ActorUserId, bool IsGlobalAdmin) : IRequest<CampaignResultsDto>;

public sealed class CampaignResultsDto
{
    public Guid CampaignId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsAnonymous { get; set; }
    public string Status { get; set; } = string.Empty;
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public int TotalParticipants { get; set; }
    public int TotalResponses { get; set; }
    public double ResponseRate => Percentage(TotalResponses, TotalParticipants);
    public ParticipationFunnelDto Funnel { get; set; } = new();
    public ResponseTimingDto Timing { get; set; } = new();
    public DataQualitySummaryDto DataQuality { get; set; } = new();
    public List<ResponseTrendPointDto> ResponseTrend { get; set; } = new();
    public List<QuestionStatsDto> Questions { get; set; } = new();
    public ReportingMethodologyDto Methodology { get; set; } = new();

    internal static double Percentage(int numerator, int denominator) =>
        denominator == 0 ? 0 : Math.Round((double)numerator / denominator * 100, 1);
}

public sealed class ParticipationFunnelDto
{
    public int Targeted { get; set; }
    public int Assigned { get; set; }
    public int EmailQueued { get; set; }
    public int EmailDelivered { get; set; }
    public int EmailFailed { get; set; }
    public int Started { get; set; }
    public int Completed { get; set; }
    public int Abandoned { get; set; }
    public int Expired { get; set; }
    public double StartToCompletionRate => CampaignResultsDto.Percentage(Completed, Started);
}

public sealed class ResponseTimingDto
{
    public DateTime? FirstResponseAt { get; set; }
    public DateTime? LastResponseAt { get; set; }
    public double? AverageCompletionSeconds { get; set; }
    public double? MedianCompletionSeconds { get; set; }
}

public sealed class DataQualitySummaryDto
{
    public int ResponsesEvaluated { get; set; }
    public int SpeedingResponses { get; set; }
    public int HighMissingResponses { get; set; }
    public int FlaggedResponses { get; set; }
    public int SpeedingThresholdSeconds { get; set; } = 30;
}

public sealed class ResponseTrendPointDto
{
    public DateTime Date { get; set; }
    public int Count { get; set; }
    public int CumulativeCount { get; set; }
}

public sealed class QuestionStatsDto
{
    public Guid QuestionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public SurveyQuestionType Type { get; set; }
    public bool IsRequired { get; set; }
    public int EligibleResponses { get; set; }
    public int TotalAnswers { get; set; }
    public int MissingAnswers { get; set; }
    public double AnswerRate => CampaignResultsDto.Percentage(TotalAnswers, EligibleResponses);
    public string PercentageDenominator { get; set; } = "Geçerli yanıtlar";
    public int TotalSelections { get; set; }
    public double? AverageSelectionsPerRespondent { get; set; }
    public List<OptionStatDto> OptionStats { get; set; } = new();
    public NumericSummaryDto? NumericSummary { get; set; }
    public NpsSummaryDto? NpsSummary { get; set; }
    public int TextAnswerCount { get; set; }
    public List<string> TextAnswers { get; set; } = new();
}

public sealed class OptionStatDto
{
    public Guid OptionId { get; set; }
    public string Label { get; set; } = string.Empty;
    public int Count { get; set; }
    public double Percentage { get; set; }
    public double? SelectionPercentage { get; set; }
}

public sealed class NumericSummaryDto
{
    public int Count { get; set; }
    public decimal? Average { get; set; }
    public decimal? Median { get; set; }
    public decimal? Mode { get; set; }
    public decimal? StandardDeviation { get; set; }
    public decimal? Minimum { get; set; }
    public decimal? Maximum { get; set; }
    public decimal? LowerQuartile { get; set; }
    public decimal? UpperQuartile { get; set; }
    public double? TopBoxPercentage { get; set; }
    public double? BottomBoxPercentage { get; set; }
}

public sealed class NpsSummaryDto
{
    public int Promoters { get; set; }
    public int Passives { get; set; }
    public int Detractors { get; set; }
    public double Score { get; set; }
}

public sealed class ReportingMethodologyDto
{
    public string ResponseRateFormula { get; set; } = "Tamamlanan yanıt / atanan kullanıcı";
    public string QuestionRateFormula { get; set; } = "Geçerli soru yanıtı / tamamlanan yanıt";
    public string MultipleChoiceNote { get; set; } = "Katılımcı yüzdesi ile toplam seçim yüzdesi ayrı hesaplanır.";
    public string RepresentationNote { get; set; } = "Yüksek katılım oranı tek başına tüm organizasyon segmentlerinin temsil edildiğini garanti etmez.";
    public int AnonymousMinimumGroupSize { get; set; } = 10;
}

public sealed class GetCampaignResultsQueryHandler : IRequestHandler<GetCampaignResultsQuery, CampaignResultsDto>
{
    private const int SpeedingThresholdSeconds = 30;
    private readonly ISurveyDbContext _context;

    public GetCampaignResultsQueryHandler(ISurveyDbContext context, ISurveyAudienceDirectory audienceDirectory)
    {
        _context = context;
        _ = audienceDirectory;
    }

    public async Task<CampaignResultsDto> Handle(GetCampaignResultsQuery request, CancellationToken cancellationToken)
    {
        var campaign = await _context.SurveyCampaigns
            .AsNoTracking()
            .Include(c => c.SurveyTemplateVersion)
                .ThenInclude(v => v.Sections)
                    .ThenInclude(s => s.Questions)
                        .ThenInclude(q => q.Options)
            .SingleOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken)
            ?? throw new FormfleksBaseApp.Application.Common.BusinessException("Kampanya bulunamadı.");

        await EnsureAggregateAccessAsync(request, cancellationToken);

        var assignments = _context.SurveyAssignments.AsNoTracking()
            .Where(a => a.SurveyCampaignId == request.CampaignId);
        var responses = _context.SurveyResponses.AsNoTracking()
            .Where(r => r.SurveyCampaignId == request.CampaignId);

        var statusCounts = await assignments.GroupBy(a => a.Status)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count, cancellationToken);
        var emailCounts = await assignments.GroupBy(a => a.EmailDeliveryStatus)
            .Select(g => new { Status = g.Key, Count = g.Count() })
            .ToDictionaryAsync(x => x.Status, x => x.Count, cancellationToken);

        var totalParticipants = statusCounts.Values.Sum();
        var totalResponses = await responses.CountAsync(cancellationToken);
        var completed = GetCount(statusCounts, SurveyAssignmentStatus.Completed);
        var startedOnly = GetCount(statusCounts, SurveyAssignmentStatus.Started);
        var started = startedOnly + completed;

        var durationSeconds = await responses.Select(r => (r.SubmittedAt - r.StartedAt).TotalSeconds)
            .Where(x => x >= 0).OrderBy(x => x).ToListAsync(cancellationToken);
        var trendRaw = await responses.GroupBy(r => r.SubmittedAt.Date)
            .Select(g => new { Date = g.Key, Count = g.Count() }).OrderBy(x => x.Date).ToListAsync(cancellationToken);

        var cumulative = 0;
        var dto = new CampaignResultsDto
        {
            CampaignId = campaign.Id,
            Title = campaign.Title,
            Description = campaign.Description,
            IsAnonymous = campaign.IsAnonymous,
            Status = campaign.Status.ToString(),
            StartDate = campaign.StartDate,
            EndDate = campaign.EndDate,
            TotalParticipants = totalParticipants,
            TotalResponses = totalResponses,
            Funnel = new ParticipationFunnelDto
            {
                Targeted = totalParticipants,
                Assigned = totalParticipants,
                EmailQueued = GetCount(emailCounts, SurveyEmailDeliveryStatus.Queued) + GetCount(emailCounts, SurveyEmailDeliveryStatus.Processing) + GetCount(emailCounts, SurveyEmailDeliveryStatus.Retry),
                EmailDelivered = GetCount(emailCounts, SurveyEmailDeliveryStatus.Delivered),
                EmailFailed = GetCount(emailCounts, SurveyEmailDeliveryStatus.Failed),
                Started = started,
                Completed = completed,
                Abandoned = startedOnly,
                Expired = GetCount(statusCounts, SurveyAssignmentStatus.Expired)
            },
            Timing = new ResponseTimingDto
            {
                FirstResponseAt = await responses.MinAsync(r => (DateTime?)r.SubmittedAt, cancellationToken),
                LastResponseAt = await responses.MaxAsync(r => (DateTime?)r.SubmittedAt, cancellationToken),
                AverageCompletionSeconds = durationSeconds.Count == 0 ? null : Math.Round(durationSeconds.Average(), 1),
                MedianCompletionSeconds = Median(durationSeconds)
            },
            DataQuality = new DataQualitySummaryDto
            {
                ResponsesEvaluated = totalResponses,
                SpeedingResponses = durationSeconds.Count(x => x < SpeedingThresholdSeconds),
                SpeedingThresholdSeconds = SpeedingThresholdSeconds
            },
            ResponseTrend = trendRaw.Select(x => new ResponseTrendPointDto
            {
                Date = x.Date,
                Count = x.Count,
                CumulativeCount = cumulative += x.Count
            }).ToList()
        };

        var questions = campaign.SurveyTemplateVersion.Sections.OrderBy(s => s.SortOrder)
            .SelectMany(s => s.Questions.OrderBy(q => q.SortOrder)).ToList();
        foreach (var question in questions)
        {
            dto.Questions.Add(await BuildQuestionStatsAsync(
                question.Id, question.Title, question.QuestionType, question.IsRequired,
                question.Options.OrderBy(o => o.SortOrder).Select(o => (o.Id, o.Label)).ToList(),
                totalResponses, request.CampaignId, cancellationToken));
        }

        var expectedQuestionsPerResponse = dto.Questions.Count(q => q.Type != SurveyQuestionType.Info);
        var responseAnswerCounts = await responses.Select(r => r.Answers.Count).ToListAsync(cancellationToken);
        dto.DataQuality.HighMissingResponses = expectedQuestionsPerResponse == 0
            ? 0
            : responseAnswerCounts.Count(count => count < expectedQuestionsPerResponse * 0.5);
        dto.DataQuality.FlaggedResponses = Math.Min(totalResponses, dto.DataQuality.SpeedingResponses + dto.DataQuality.HighMissingResponses);
        return dto;
    }

    private async Task<QuestionStatsDto> BuildQuestionStatsAsync(Guid questionId, string title, SurveyQuestionType type,
        bool isRequired, List<(Guid Id, string Label)> options, int totalResponses, Guid campaignId,
        CancellationToken cancellationToken)
    {
        var query = _context.SurveyAnswers.AsNoTracking()
            .Where(a => a.SurveyVersionQuestionId == questionId && a.SurveyResponse.SurveyCampaignId == campaignId);
        var answerCount = type == SurveyQuestionType.Info ? 0 : await query.CountAsync(cancellationToken);
        var result = new QuestionStatsDto
        {
            QuestionId = questionId,
            Title = title,
            Type = type,
            IsRequired = isRequired,
            EligibleResponses = type == SurveyQuestionType.Info ? 0 : totalResponses,
            TotalAnswers = answerCount,
            MissingAnswers = type == SurveyQuestionType.Info ? 0 : Math.Max(0, totalResponses - answerCount),
            TextAnswerCount = type is SurveyQuestionType.ShortText or SurveyQuestionType.LongText
                ? await query.CountAsync(a => !string.IsNullOrWhiteSpace(a.ValueText), cancellationToken) : 0
        };

        if (type is SurveyQuestionType.SingleChoice or SurveyQuestionType.MultipleChoice)
        {
            var jsonAnswers = await query.Where(a => a.ValueJson != null).Select(a => a.ValueJson!).ToListAsync(cancellationToken);
            var counts = options.ToDictionary(o => o.Id, _ => 0);
            foreach (var json in jsonAnswers)
            {
                try
                {
                    foreach (var selectedId in JsonSerializer.Deserialize<List<Guid>>(json) ?? [])
                        if (counts.ContainsKey(selectedId)) counts[selectedId]++;
                }
                catch (JsonException) { }
            }

            result.TotalSelections = counts.Values.Sum();
            result.AverageSelectionsPerRespondent = answerCount == 0 ? null : Math.Round((double)result.TotalSelections / answerCount, 2);
            result.OptionStats = options.Select(o => new OptionStatDto
            {
                OptionId = o.Id,
                Label = o.Label,
                Count = counts[o.Id],
                Percentage = CampaignResultsDto.Percentage(counts[o.Id], answerCount),
                SelectionPercentage = CampaignResultsDto.Percentage(counts[o.Id], result.TotalSelections)
            }).ToList();
        }
        else if (type == SurveyQuestionType.YesNo)
        {
            var counts = await query.Where(a => a.ValueText != null).GroupBy(a => a.ValueText!.ToLower())
                .Select(g => new { Value = g.Key, Count = g.Count() })
                .ToDictionaryAsync(x => x.Value, x => x.Count, cancellationToken);
            AddBooleanOption(result, "Evet", true, counts.GetValueOrDefault("true"), answerCount);
            AddBooleanOption(result, "Hayır", false, counts.GetValueOrDefault("false"), answerCount);
        }
        else if (type is SurveyQuestionType.Rating or SurveyQuestionType.NPS or SurveyQuestionType.Number)
        {
            var values = await query.Where(a => a.ValueNumber.HasValue).Select(a => a.ValueNumber!.Value)
                .OrderBy(x => x).ToListAsync(cancellationToken);
            result.NumericSummary = BuildNumericSummary(values, type);
            result.OptionStats = values.GroupBy(x => x).Select(g => new OptionStatDto
            {
                OptionId = Guid.Empty,
                Label = g.Key.ToString("0.##"),
                Count = g.Count(),
                Percentage = CampaignResultsDto.Percentage(g.Count(), values.Count)
            }).ToList();
            if (type == SurveyQuestionType.NPS)
            {
                var promoters = values.Count(x => x >= 9);
                var detractors = values.Count(x => x <= 6);
                result.NpsSummary = new NpsSummaryDto
                {
                    Promoters = promoters,
                    Passives = values.Count - promoters - detractors,
                    Detractors = detractors,
                    Score = values.Count == 0 ? 0 : Math.Round((double)(promoters - detractors) / values.Count * 100, 1)
                };
            }
        }
        return result;
    }

    private static NumericSummaryDto BuildNumericSummary(List<decimal> values, SurveyQuestionType type)
    {
        if (values.Count == 0) return new NumericSummaryDto();
        var average = values.Average();
        var variance = values.Count < 2 ? 0 : values.Sum(x => (x - average) * (x - average)) / (values.Count - 1);
        var minimum = values[0];
        var maximum = values[^1];
        return new NumericSummaryDto
        {
            Count = values.Count,
            Average = Math.Round(average, 2),
            Median = Percentile(values, 0.5),
            Mode = values.GroupBy(x => x).OrderByDescending(g => g.Count()).ThenBy(g => g.Key).First().Key,
            StandardDeviation = Math.Round((decimal)Math.Sqrt((double)variance), 2),
            Minimum = minimum,
            Maximum = maximum,
            LowerQuartile = Percentile(values, 0.25),
            UpperQuartile = Percentile(values, 0.75),
            TopBoxPercentage = type == SurveyQuestionType.Rating ? CampaignResultsDto.Percentage(values.Count(x => x == maximum), values.Count) : null,
            BottomBoxPercentage = type == SurveyQuestionType.Rating ? CampaignResultsDto.Percentage(values.Count(x => x == minimum), values.Count) : null
        };
    }

    private static decimal Percentile(List<decimal> sortedValues, double percentile)
    {
        if (sortedValues.Count == 1) return sortedValues[0];
        var position = (sortedValues.Count - 1) * percentile;
        var lower = (int)Math.Floor(position);
        var upper = (int)Math.Ceiling(position);
        if (lower == upper) return sortedValues[lower];
        return Math.Round(sortedValues[lower] + (sortedValues[upper] - sortedValues[lower]) * (decimal)(position - lower), 2);
    }

    private static double? Median(List<double> sortedValues)
    {
        if (sortedValues.Count == 0) return null;
        var middle = sortedValues.Count / 2;
        return sortedValues.Count % 2 == 0
            ? Math.Round((sortedValues[middle - 1] + sortedValues[middle]) / 2, 1)
            : Math.Round(sortedValues[middle], 1);
    }

    private static void AddBooleanOption(QuestionStatsDto result, string label, bool value, int count, int answerCount) =>
        result.OptionStats.Add(new OptionStatDto
        {
            OptionId = value ? new Guid("00000000-0000-0000-0000-000000000001") : Guid.Empty,
            Label = label,
            Count = count,
            Percentage = CampaignResultsDto.Percentage(count, answerCount)
        });

    private static int GetCount<T>(IReadOnlyDictionary<T, int> counts, T key) where T : notnull =>
        counts.TryGetValue(key, out var count) ? count : 0;

    private async Task EnsureAggregateAccessAsync(GetCampaignResultsQuery request, CancellationToken cancellationToken)
    {
        if (request.IsGlobalAdmin) return;
        var isViewer = await _context.SurveyResultViewers.AsNoTracking()
            .AnyAsync(v => v.SurveyCampaignId == request.CampaignId && v.UserId == request.ActorUserId, cancellationToken);
        if (!isViewer)
            throw new FormfleksBaseApp.Application.Common.BusinessException("Bu anketin sonuçlarını görüntüleme yetkiniz yok.");
    }
}
