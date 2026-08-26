using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignCrosstab;

public record GetCampaignCrosstabQuery(Guid CampaignId, Guid QuestionId, string Dimension,
    Guid ActorUserId, bool IsGlobalAdmin) : IRequest<CampaignCrosstabDto>;

public sealed class CampaignCrosstabDto
{
    public Guid QuestionId { get; set; }
    public string QuestionTitle { get; set; } = string.Empty;
    public string Dimension { get; set; } = string.Empty;
    public int FilteredResponses { get; set; }
    public List<string> Columns { get; set; } = new();
    public List<CrosstabRowDto> Rows { get; set; } = new();
    public StatisticalTestDto StatisticalTest { get; set; } = new();
}

public sealed class CrosstabRowDto
{
    public string Label { get; set; } = string.Empty;
    public int? Respondents { get; set; }
    public bool IsSuppressed { get; set; }
    public Dictionary<string, CrosstabCellDto?> Cells { get; set; } = new();
}

public sealed class CrosstabCellDto
{
    public int Count { get; set; }
    public double RowPercentage { get; set; }
}

public sealed class StatisticalTestDto
{
    public bool IsAvailable { get; set; }
    public string? UnavailableReason { get; set; }
    public double? ChiSquare { get; set; }
    public int? DegreesOfFreedom { get; set; }
    public double? CramersV { get; set; }
}

public sealed class GetCampaignCrosstabQueryHandler : IRequestHandler<GetCampaignCrosstabQuery, CampaignCrosstabDto>
{
    private const int MinimumAnonymousGroupSize = 10;
    private readonly ISurveyDbContext _context;

    public GetCampaignCrosstabQueryHandler(ISurveyDbContext context) => _context = context;

    public async Task<CampaignCrosstabDto> Handle(GetCampaignCrosstabQuery request, CancellationToken cancellationToken)
    {
        var campaign = await _context.SurveyCampaigns.AsNoTracking()
            .Where(c => c.Id == request.CampaignId)
            .Select(c => new { c.IsAnonymous, c.SurveyTemplateVersionId })
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new FormfleksBaseApp.Application.Common.NotFoundException("Kampanya bulunamadı.");
        await EnsureAccessAsync(request, cancellationToken);

        var question = await _context.SurveyVersionQuestions.AsNoTracking().Include(q => q.Options)
            .SingleOrDefaultAsync(q => q.Id == request.QuestionId &&
                q.SurveyVersionSection.SurveyTemplateVersionId == campaign.SurveyTemplateVersionId, cancellationToken)
            ?? throw new FormfleksBaseApp.Application.Common.NotFoundException("Soru bulunamadı.");
        if (question.QuestionType is not (SurveyQuestionType.SingleChoice or SurveyQuestionType.MultipleChoice or SurveyQuestionType.YesNo or SurveyQuestionType.Rating or SurveyQuestionType.NPS))
            throw new FormfleksBaseApp.Application.Common.BusinessException("Bu soru türü çapraz tablo için uygun değildir.");

        var dimension = request.Dimension.Trim().ToLowerInvariant();
        if (dimension is not ("company" or "location" or "department" or "title" or "personnelgroup"))
            throw new FormfleksBaseApp.Application.Common.BusinessException("Desteklenmeyen segment boyutu.");

        var raw = await _context.SurveyResponses.AsNoTracking()
            .Where(r => r.SurveyCampaignId == request.CampaignId)
            .Select(r => new CrosstabProjection
            {
                DimensionValue = dimension == "company" ? r.CompanySnapshot :
                    dimension == "location" ? r.LocationSnapshot :
                    dimension == "department" ? r.DepartmentSnapshot :
                    dimension == "title" ? r.JobTitleSnapshot : r.PersonnelGroupSnapshot,
                TextValue = r.Answers.Where(a => a.SurveyVersionQuestionId == request.QuestionId).Select(a => a.ValueText).FirstOrDefault(),
                NumberValue = r.Answers.Where(a => a.SurveyVersionQuestionId == request.QuestionId).Select(a => a.ValueNumber).FirstOrDefault(),
                JsonValue = r.Answers.Where(a => a.SurveyVersionQuestionId == request.QuestionId).Select(a => a.ValueJson).FirstOrDefault()
            }).ToListAsync(cancellationToken);

        var optionLabels = question.Options.ToDictionary(o => o.Id, o => o.Label);
        var observations = raw.SelectMany(row => ResolveColumns(row, question.QuestionType, optionLabels)
            .Select(column => new Observation(row.DimensionValue ?? "Belirtilmemiş", column))).ToList();
        var columns = observations.Select(x => x.Column).Distinct().OrderBy(x => x).ToList();

        var dto = new CampaignCrosstabDto
        {
            QuestionId = question.Id,
            QuestionTitle = question.Title,
            Dimension = dimension,
            FilteredResponses = raw.Count,
            Columns = columns
        };

        foreach (var group in observations.GroupBy(x => x.Row).OrderByDescending(g => g.Count()))
        {
            var respondentCount = raw.Count(x => (x.DimensionValue ?? "Belirtilmemiş") == group.Key);
            var suppressed = campaign.IsAnonymous && respondentCount < MinimumAnonymousGroupSize;
            var row = new CrosstabRowDto { Label = group.Key, Respondents = suppressed ? null : respondentCount, IsSuppressed = suppressed };
            foreach (var column in columns)
            {
                if (suppressed) { row.Cells[column] = null; continue; }
                var count = group.Count(x => x.Column == column);
                row.Cells[column] = new CrosstabCellDto
                {
                    Count = count,
                    RowPercentage = respondentCount == 0 ? 0 : Math.Round((double)count / respondentCount * 100, 1)
                };
            }
            dto.Rows.Add(row);
        }

        dto.StatisticalTest = question.QuestionType == SurveyQuestionType.MultipleChoice
            ? new StatisticalTestDto { UnavailableReason = "Çoklu seçimlerde gözlemler bağımsız olmadığı için ki-kare testi uygulanmadı." }
            : CalculateStatistics(dto.Rows.Where(r => !r.IsSuppressed).ToList(), columns);
        return dto;
    }

    private static IEnumerable<string> ResolveColumns(CrosstabProjection row, SurveyQuestionType type, IReadOnlyDictionary<Guid, string> labels)
    {
        if (type is SurveyQuestionType.SingleChoice or SurveyQuestionType.MultipleChoice)
        {
            if (string.IsNullOrWhiteSpace(row.JsonValue)) return [];
            try { return (JsonSerializer.Deserialize<List<Guid>>(row.JsonValue) ?? []).Where(labels.ContainsKey).Select(id => labels[id]); }
            catch (JsonException) { return []; }
        }
        if (type == SurveyQuestionType.YesNo && row.TextValue != null)
            return [row.TextValue.Equals("true", StringComparison.OrdinalIgnoreCase) ? "Evet" : "Hayır"];
        return row.NumberValue.HasValue ? [row.NumberValue.Value.ToString("0.##")] : [];
    }

    private static StatisticalTestDto CalculateStatistics(List<CrosstabRowDto> rows, List<string> columns)
    {
        if (rows.Count < 2 || columns.Count < 2)
            return new StatisticalTestDto { UnavailableReason = "En az iki satır ve iki sütun gereklidir." };
        var matrix = rows.Select(row => columns.Select(column => row.Cells[column]?.Count ?? 0).ToArray()).ToArray();
        var total = matrix.Sum(row => row.Sum());
        if (total == 0) return new StatisticalTestDto { UnavailableReason = "Test için geçerli gözlem bulunmuyor." };
        var rowTotals = matrix.Select(row => row.Sum()).ToArray();
        var columnTotals = Enumerable.Range(0, columns.Count).Select(index => matrix.Sum(row => row[index])).ToArray();
        var chiSquare = 0d;
        for (var row = 0; row < rows.Count; row++)
        for (var column = 0; column < columns.Count; column++)
        {
            var expected = (double)rowTotals[row] * columnTotals[column] / total;
            if (expected < 5) return new StatisticalTestDto { UnavailableReason = "Beklenen hücre sayılarından biri 5'in altında olduğu için test uygulanmadı." };
            chiSquare += Math.Pow(matrix[row][column] - expected, 2) / expected;
        }
        var degrees = (rows.Count - 1) * (columns.Count - 1);
        var denominator = total * Math.Min(rows.Count - 1, columns.Count - 1);
        return new StatisticalTestDto
        {
            IsAvailable = true,
            ChiSquare = Math.Round(chiSquare, 3),
            DegreesOfFreedom = degrees,
            CramersV = denominator == 0 ? null : Math.Round(Math.Sqrt(chiSquare / denominator), 3)
        };
    }

    private async Task EnsureAccessAsync(GetCampaignCrosstabQuery request, CancellationToken cancellationToken)
    {
        if (request.IsGlobalAdmin) return;
        var allowed = await _context.SurveyResultViewers.AsNoTracking().AnyAsync(v => v.SurveyCampaignId == request.CampaignId && v.UserId == request.ActorUserId, cancellationToken);
        if (!allowed) throw new FormfleksBaseApp.Application.Common.BusinessException("Bu anketin sonuçlarını görüntüleme yetkiniz yok.");
    }

    private sealed class CrosstabProjection
    {
        public string? DimensionValue { get; set; }
        public string? TextValue { get; set; }
        public decimal? NumberValue { get; set; }
        public string? JsonValue { get; set; }
    }

    private sealed record Observation(string Row, string Column);
}
