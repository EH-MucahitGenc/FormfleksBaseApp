using System.Collections.Generic;
using System.Linq;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignResults;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignSegments;

namespace FormfleksBaseApp.Application.Features.Surveys.Common;

public interface ISurveyAnonymousSuppressionService
{
    int MinimumGroupSize { get; }
    bool ShouldSuppress(int count, bool isAnonymous);
    void SuppressTiming(ResponseTimingDto timing);
    void SuppressDataQuality(DataQualitySummaryDto dq);
    void SuppressTrend(List<ResponseTrendPointDto> trend);
    void SuppressQuestions(List<QuestionStatsDto> questions);
    void SuppressSegments(List<CampaignSegmentItemDto> segments);
}

public class SurveyAnonymousSuppressionService : ISurveyAnonymousSuppressionService
{
    private readonly FormfleksBaseApp.Application.Common.Interfaces.ISystemSettingsService? _systemSettingsService;

    public SurveyAnonymousSuppressionService(FormfleksBaseApp.Application.Common.Interfaces.ISystemSettingsService? systemSettingsService = null)
    {
        _systemSettingsService = systemSettingsService;
    }

    public int MinimumGroupSize 
    {
        get
        {
            var settings = _systemSettingsService?.GetSetting<SurveyModuleSettings>("SurveyModuleSettings");
            var size = settings?.MinimumAnonymousGroupSize ?? 10;
            return size < 10 ? 10 : size;
        }
    }

    public bool ShouldSuppress(int count, bool isAnonymous)
    {
        return isAnonymous && count > 0 && count < MinimumGroupSize;
    }

    public void SuppressTiming(ResponseTimingDto timing)
    {
        timing.FirstResponseAt = null;
        timing.LastResponseAt = null;
        timing.AverageCompletionSeconds = null;
        timing.MedianCompletionSeconds = null;
    }

    public void SuppressDataQuality(DataQualitySummaryDto dq)
    {
        dq.SpeedingResponses = 0;
        dq.HighMissingResponses = 0;
        dq.FlaggedResponses = 0;
    }

    public void SuppressTrend(List<ResponseTrendPointDto> trend)
    {
        trend.Clear();
    }

    public void SuppressQuestions(List<QuestionStatsDto> questions)
    {
        foreach (var q in questions)
        {
            q.TextAnswers.Clear();
            q.TextAnswerCount = 0;
            q.NumericSummary = null;
            q.NpsSummary = null;
            
            // Eğer soru bazlı bir suppress gerekirse seçenek dağılımını da gizleyebiliriz,
            // ancak genelde tüm anketin yanıt sayısı MinimumGroupSize'dan küçükse
            // questions array'i komple temizlenir veya option stats gizlenir.
            foreach (var opt in q.OptionStats)
            {
                opt.Count = 0;
                opt.Percentage = 0;
                if (opt.SelectionPercentage.HasValue) opt.SelectionPercentage = 0;
            }
            q.TotalAnswers = 0;
            q.TotalSelections = 0;
        }
    }

    public void SuppressSegments(List<CampaignSegmentItemDto> segments)
    {
        foreach (var s in segments.Where(x => (x.Responses ?? 0) > 0 && (x.Responses ?? 0) < MinimumGroupSize))
        {
            s.Responses = null;
            s.ResponseRate = null;
        }
    }
}
