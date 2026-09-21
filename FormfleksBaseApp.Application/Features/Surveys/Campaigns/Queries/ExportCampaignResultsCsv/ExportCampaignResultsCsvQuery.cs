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

public record ExportCampaignResultsCsvQuery(Guid CampaignId, Guid ActorUserId) : IRequest<byte[]>;

public sealed class ExportCampaignResultsCsvQueryHandler : IRequestHandler<ExportCampaignResultsCsvQuery, byte[]>
{
    private readonly ISurveyDbContext _context;
    private readonly FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAudienceDirectory _audienceDirectory;
    private readonly FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAnonymousSuppressionService _suppressionService;
    private readonly FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAuthorizationService _authService;

    private readonly FormfleksBaseApp.Application.Common.Interfaces.IDynamicFormsDbContext _dynamicFormsDb;

    public ExportCampaignResultsCsvQueryHandler(
        ISurveyDbContext context, 
        FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAudienceDirectory audienceDirectory,
        FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAnonymousSuppressionService suppressionService,
        FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAuthorizationService authService,
        FormfleksBaseApp.Application.Common.Interfaces.IDynamicFormsDbContext dynamicFormsDb)
    {
        _context = context;
        _audienceDirectory = audienceDirectory;
        _suppressionService = suppressionService;
        _authService = authService;
        _dynamicFormsDb = dynamicFormsDb;
    }

    public async Task<byte[]> Handle(ExportCampaignResultsCsvQuery request, CancellationToken cancellationToken)
    {
        var campaign = await _context.SurveyCampaigns.AsNoTracking()
            .Include(c => c.SurveyTemplateVersion)
                .ThenInclude(v => v.Sections)
                    .ThenInclude(s => s.Questions)
                        .ThenInclude(q => q.Options)
            .FirstOrDefaultAsync(c => c.Id == request.CampaignId, cancellationToken);

        if (campaign == null)
            throw new FormfleksBaseApp.Application.Common.BusinessException("Kampanya bulunamadı.");

        // YETKİ KONTROLÜ
        await _authService.EnsureCampaignPermissionAsync(request.ActorUserId, request.CampaignId, FormfleksBaseApp.Domain.Enums.Surveys.SurveyAction.ExportAggregateResults, cancellationToken);

        // Export Identified yetkisi var mı kontrol et
        var canExportIdentified = await _authService.HasCampaignPermissionAsync(request.ActorUserId, request.CampaignId, FormfleksBaseApp.Domain.Enums.Surveys.SurveyAction.ExportIdentifiedResponses, cancellationToken);

        var responses = await _context.SurveyResponses
            .Include(r => r.SurveyAssignment)
            .Include(r => r.Answers)
                .ThenInclude(a => a.Files)
            .Where(r => r.SurveyCampaignId == request.CampaignId)
            .OrderBy(r => r.SubmittedAt)
            .ToListAsync(cancellationToken);

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

        var includeIdentities = canExportIdentified && !campaign.IsAnonymous;
        var shouldSuppress = _suppressionService.ShouldSuppress(responses.Count, campaign.IsAnonymous);

        if (!includeIdentities)
        {
            sb.AppendLine("Soru;Seçenek / Metrik;Sayı;Yüzde;Payda");
            
            if (!shouldSuppress)
            {
                foreach (var question in questions.Where(q => q.QuestionType != SurveyQuestionType.Info))
                {
                    var answers = responses.SelectMany(r => r.Answers).Where(a => a.SurveyVersionQuestionId == question.Id).ToList();
                    var validCount = answers.Count;
                    if (question.QuestionType is SurveyQuestionType.SingleChoice or SurveyQuestionType.MultipleChoice)
                    {
                        var selectedIds = new List<Guid>();
                        foreach (var answer in answers.Where(a => !string.IsNullOrWhiteSpace(a.ValueJson)))
                        {
                            try { selectedIds.AddRange(JsonSerializer.Deserialize<List<Guid>>(answer.ValueJson!) ?? []); }
                            catch (JsonException) { }
                        }
                        foreach (var option in question.Options.OrderBy(o => o.SortOrder))
                        {
                            var count = selectedIds.Count(id => id == option.Id);
                            var percentage = validCount == 0 ? 0 : Math.Round((double)count / validCount * 100, 1);
                            sb.AppendLine($"{SanitizeCsv(question.Title)};{SanitizeCsv(option.Label)};{count};{percentage};{validCount}");
                        }
                    }
                    else if (question.QuestionType is SurveyQuestionType.Rating or SurveyQuestionType.NPS or SurveyQuestionType.Number)
                    {
                        var values = answers.Where(a => a.ValueNumber.HasValue).Select(a => a.ValueNumber!.Value).ToList();
                        var average = values.Count == 0 ? "" : Math.Round(values.Average(), 2).ToString("0.##");
                        sb.AppendLine($"{SanitizeCsv(question.Title)};Ortalama;{average};;{values.Count}");
                    }
                    else if (question.QuestionType is SurveyQuestionType.ShortText or SurveyQuestionType.LongText)
                    {
                        sb.AppendLine($"{SanitizeCsv(question.Title)};Metin yanıtı sayısı;{validCount};;{responses.Count}");
                    }
                    else
                    {
                        sb.AppendLine($"{SanitizeCsv(question.Title)};Geçerli yanıt;{validCount};{(responses.Count == 0 ? 0 : Math.Round((double)validCount / responses.Count * 100, 1))};{responses.Count}");
                    }
                }
            }
            else 
            {
                sb.AppendLine($"Uyarı;Minimum anonim grup büyüklüğü ({_suppressionService.MinimumGroupSize}) sağlanmadığı için sonuçlar gizlenmiştir.;;;");
            }

            var aggregateBytes = Encoding.UTF8.GetBytes(sb.ToString());
            var aggregateResult = Encoding.UTF8.GetPreamble().Concat(aggregateBytes).ToArray();

            _dynamicFormsDb.AuditLogs.Add(new FormfleksBaseApp.Domain.Entities.DynamicForms.AuditLogEntity
            {
                Id = Guid.NewGuid(),
                EntityType = "SurveyCampaign",
                EntityId = request.CampaignId,
                ActionType = "AggregateExportCreated",
                ActorUserId = request.ActorUserId,
                DetailJson = JsonSerializer.Serialize(new { 
                    TotalResponses = responses.Count
                }),
                CreatedAt = DateTime.UtcNow
            });
            await _dynamicFormsDb.SaveChangesAsync(cancellationToken);

            return aggregateResult;
        }

        // Header
        sb.Append("Yanıt ID;Katılımcı;E-posta;Departman;Lokasyon;Başlama Zamanı;Bitiş Zamanı");

        foreach (var q in questions)
        {
            sb.Append($";{SanitizeCsv(q.Title ?? "Soru")}");
        }
        sb.AppendLine();

        // Rows
        int rowIndex = 1;
        foreach (var r in responses)
        {
            var assignment = r.SurveyAssignment;
            sb.Append($"{r.Id};{SanitizeCsv(assignment?.ParticipantDisplayName ?? "Bilinmeyen Kullanıcı")};{SanitizeCsv(assignment?.ParticipantEmail)};{SanitizeCsv(assignment?.DepartmentSnapshot)};{SanitizeCsv(assignment?.LocationSnapshot)};{r.StartedAt:dd.MM.yyyy HH:mm};{r.SubmittedAt:dd.MM.yyyy HH:mm}");
            
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
        var identifiedResult = bom.Concat(bytes).ToArray();

        _dynamicFormsDb.AuditLogs.Add(new FormfleksBaseApp.Domain.Entities.DynamicForms.AuditLogEntity
        {
            Id = Guid.NewGuid(),
            EntityType = "SurveyCampaign",
            EntityId = request.CampaignId,
            ActionType = includeIdentities ? "IdentifiedExportCreated" : "AggregateExportCreated",
            ActorUserId = request.ActorUserId,
            DetailJson = JsonSerializer.Serialize(new { 
                TotalResponses = responses.Count
            }),
            CreatedAt = DateTime.UtcNow
        });
        await _dynamicFormsDb.SaveChangesAsync(cancellationToken);

        return identifiedResult;
    }
}
