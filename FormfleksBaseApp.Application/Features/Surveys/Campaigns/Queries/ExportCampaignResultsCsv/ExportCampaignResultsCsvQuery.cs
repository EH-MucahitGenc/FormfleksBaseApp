using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.ExportCampaignResultsCsv;

public record ExportCampaignResultsCsvQuery(Guid CampaignId, Guid ActorUserId, bool IsGlobalAdmin) : IRequest<byte[]>;

public class ExportCampaignResultsCsvQueryHandler : IRequestHandler<ExportCampaignResultsCsvQuery, byte[]>
{
    private readonly ISurveyDbContext _context;
    private readonly IDynamicFormsDbContext _dynamicFormsContext;

    public ExportCampaignResultsCsvQueryHandler(ISurveyDbContext context, IDynamicFormsDbContext dynamicFormsContext)
    {
        _context = context;
        _dynamicFormsContext = dynamicFormsContext;
    }

    public async Task<byte[]> Handle(ExportCampaignResultsCsvQuery request, CancellationToken cancellationToken)
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
                throw new FormfleksBaseApp.Application.Common.BusinessException("Bu anketin sonuçlarını dışa aktarma yetkiniz yok.");
        }

        var responses = await _context.SurveyResponses
            .Include(r => r.Answers)
                .ThenInclude(a => a.Files)
            .Where(r => r.SurveyCampaignId == request.CampaignId)
            .OrderBy(r => r.SubmittedAt)
            .ToListAsync(cancellationToken);

        var userIds = responses.Where(r => r.UserId.HasValue).Select(r => r.UserId!.Value).Distinct().ToList();
        var userDict = new Dictionary<Guid, string>();
        if (userIds.Any() && !campaign.IsAnonymous)
        {
            userDict = await _dynamicFormsContext.QdmsPersoneller
                .AsNoTracking()
                .Where(u => u.LinkedUserId != null && userIds.Contains(u.LinkedUserId.Value))
                .ToDictionaryAsync(u => u.LinkedUserId!.Value, u => u.Adi + " " + u.Soyadi, cancellationToken);
        }

        var questions = campaign.SurveyTemplateVersion.Sections.SelectMany(s => s.Questions).OrderBy(q => q.SortOrder).ToList();

        var sb = new StringBuilder();
        
        // CSV Formula Injection Protection Helper
        string SanitizeCsv(string? input)
        {
            if (string.IsNullOrWhiteSpace(input)) return "";
            var sanitized = input.Replace(";", ",").Replace("\r", "").Replace("\n", " ");
            if (sanitized.StartsWith("=") || sanitized.StartsWith("+") || sanitized.StartsWith("-") || sanitized.StartsWith("@"))
            {
                sanitized = "'" + sanitized;
            }
            return sanitized;
        }

        // Header
        if (campaign.IsAnonymous)
        {
            sb.Append("Yanıt No;Tarih");
        }
        else
        {
            sb.Append("Yanıt ID;Katılımcı;Başlama Zamanı;Bitiş Zamanı;Makbuz Kodu");
        }

        foreach (var q in questions)
        {
            sb.Append($";{SanitizeCsv(q.Title ?? "Soru")}");
        }
        sb.AppendLine();

        // Rows
        int rowIndex = 1;
        foreach (var r in responses)
        {
            if (campaign.IsAnonymous)
            {
                // Mask identifiers and exact times for anonymity
                sb.Append($"{rowIndex};{r.SubmittedAt:dd.MM.yyyy}");
            }
            else
            {
                string participantName = "-";
                if (r.UserId.HasValue)
                {
                    participantName = userDict.GetValueOrDefault(r.UserId.Value, "Bilinmeyen Kullanıcı");
                }
                sb.Append($"{r.Id};{participantName};{r.StartedAt:dd.MM.yyyy HH:mm};{r.SubmittedAt:dd.MM.yyyy HH:mm};{r.ReceiptCode ?? "-"}");
            }
            
            rowIndex++;

            foreach (var q in questions)
            {
                var ans = r.Answers.FirstOrDefault(a => a.SurveyVersionQuestionId == q.Id);
                if (ans == null)
                {
                    sb.Append(";");
                    continue;
                }

                string cellValue = "";

                if (q.QuestionType == SurveyQuestionType.ShortText || q.QuestionType == SurveyQuestionType.LongText || q.QuestionType == SurveyQuestionType.YesNo || q.QuestionType == SurveyQuestionType.Date)
                {
                    cellValue = ans.ValueText ?? "";
                }
                else if (q.QuestionType == SurveyQuestionType.Number || q.QuestionType == SurveyQuestionType.Rating || q.QuestionType == SurveyQuestionType.NPS)
                {
                    if (ans.ValueNumber.HasValue)
                    {
                        cellValue = ans.ValueNumber.Value % 1 == 0 ? ((long)ans.ValueNumber.Value).ToString() : ans.ValueNumber.Value.ToString("0.##");
                    }
                }
                else if (q.QuestionType == SurveyQuestionType.SingleChoice || q.QuestionType == SurveyQuestionType.MultipleChoice)
                {
                    if (!string.IsNullOrEmpty(ans.ValueJson))
                    {
                        try
                        {
                            var selectedIds = JsonSerializer.Deserialize<List<Guid>>(ans.ValueJson);
                            if (selectedIds != null)
                            {
                                var labels = q.Options.Where(o => selectedIds.Contains(o.Id)).Select(o => o.Label);
                                cellValue = string.Join(", ", labels);
                            }
                        }
                        catch { }
                    }
                }
                else if (q.QuestionType == SurveyQuestionType.File)
                {
                    if (ans.Files != null && ans.Files.Any())
                    {
                        cellValue = string.Join(", ", ans.Files.Select(f => f.FileName));
                    }
                }
                else if (q.QuestionType == SurveyQuestionType.Matrix)
                {
                    if (!string.IsNullOrWhiteSpace(ans.ValueJson) && !string.IsNullOrWhiteSpace(q.SettingsJson))
                    {
                        try
                        {
                            using var valDoc = JsonDocument.Parse(ans.ValueJson);
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
                            cellValue = string.Join(" | ", parts);
                        }
                        catch
                        {
                            cellValue = ans.ValueJson;
                        }
                    }
                    else
                    {
                        cellValue = ans.ValueJson ?? "";
                    }
                }

                // CSV injection prevention is already in SanitizeCsv, but we still need normal CSV escaping
                cellValue = SanitizeCsv(cellValue);

                if (cellValue.Contains(";") || cellValue.Contains("\n") || cellValue.Contains("\""))
                {
                    cellValue = cellValue.Replace("\"", "\"\"");
                    cellValue = $"\"{cellValue}\"";
                }

                sb.Append($";{cellValue}");
            }
            sb.AppendLine();
        }

        var csvString = sb.ToString();
        var bytes = Encoding.UTF8.GetBytes(csvString);
        var bom = Encoding.UTF8.GetPreamble();
        return bom.Concat(bytes).ToArray();
    }
}
