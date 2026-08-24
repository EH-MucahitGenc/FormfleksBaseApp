using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.Surveys;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Participants.Commands.SubmitSurveyResponse;

public record SurveyAnswerDto(Guid QuestionId, string? TextValue, decimal? NumericValue, List<Guid>? SelectedOptionIds);

public record SubmitSurveyResult(bool Success, string? ReceiptCode);

public record SubmitSurveyResponseCommand(string Token, List<SurveyAnswerDto> Answers) : IRequest<SubmitSurveyResult>;

public class SubmitSurveyResponseCommandHandler : IRequestHandler<SubmitSurveyResponseCommand, SubmitSurveyResult>
{
    private readonly ISurveyDbContext _context;

    public SubmitSurveyResponseCommandHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<SubmitSurveyResult> Handle(SubmitSurveyResponseCommand request, CancellationToken cancellationToken)
    {
        if (!Guid.TryParse(request.Token, out var parsedToken))
            throw new FormfleksBaseApp.Application.Common.BusinessException("Geçersiz token formatı.");

        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        
        try
        {
            var assignment = await _context.SurveyAssignments
                .Include(a => a.SurveyCampaign)
                .FirstOrDefaultAsync(a => a.Token == parsedToken, cancellationToken);

            if (assignment == null)
                throw new FormfleksBaseApp.Application.Common.NotFoundException("Geçersiz token. Katılımcı kaydı bulunamadı.");

            if (assignment.Status == SurveyAssignmentStatus.Completed)
                throw new FormfleksBaseApp.Application.Common.ConflictException("Bu anketi zaten doldurdunuz.");
                
            if (assignment.SurveyCampaign.Status != SurveyCampaignStatus.Published)
                throw new FormfleksBaseApp.Application.Common.GoneException("Kampanya aktif değil.");
                
            var now = DateTime.UtcNow;
            if (assignment.SurveyCampaign.StartDate > now)
                throw new FormfleksBaseApp.Application.Common.GoneException("Bu anketin başlangıç tarihi henüz gelmemiştir.");
                
            if (assignment.SurveyCampaign.EndDate.HasValue && assignment.SurveyCampaign.EndDate.Value < now)
                throw new FormfleksBaseApp.Application.Common.GoneException("Bu anketin süresi dolmuştur.");

            // Validation against actual questions
            var validQuestions = await _context.SurveyVersionQuestions
                .Include(q => q.Options)
                .Where(q => q.SurveyVersionSection.SurveyTemplateVersionId == assignment.SurveyCampaign.SurveyTemplateVersionId)
                .ToListAsync(cancellationToken);

            var validQuestionIds = validQuestions.Select(q => q.Id).ToHashSet();

            // Concurrency guard: This will throw if a second transaction tries to insert the same token.
            _context.SurveyParticipationGuards.Add(new SurveyParticipationGuard
            {
                Token = assignment.Token,
                CompletedAt = DateTime.UtcNow
            });
            
            // Update assignment status
            assignment.Status = SurveyAssignmentStatus.Completed;
            assignment.CompletedAt = DateTime.UtcNow;

            string? receiptCode = null;
            if (assignment.SurveyCampaign.IsAnonymous)
            {
                receiptCode = Guid.NewGuid().ToString("N").Substring(0, 8).ToUpper();
            }

            var response = new SurveyResponse
            {
                Id = Guid.NewGuid(),
                SurveyCampaignId = assignment.SurveyCampaignId,
                SurveyAssignmentId = assignment.SurveyCampaign.IsAnonymous ? null : assignment.Id,
                UserId = assignment.SurveyCampaign.IsAnonymous ? null : assignment.UserId,
                StartedAt = DateTime.UtcNow,
                SubmittedAt = DateTime.UtcNow,
                ReceiptCode = receiptCode
            };

            // We need to evaluate visibility rules server-side
            var answersGroup = request.Answers.GroupBy(a => a.QuestionId).ToList();
            if (answersGroup.Any(g => g.Count() > 1))
                throw new FormfleksBaseApp.Application.Common.BusinessException("Bazı sorular için birden fazla cevap gönderilmiş.");
                
            var answersDict = answersGroup.ToDictionary(g => g.Key, g => g.First());
            var answeredQuestionIds = new HashSet<Guid>();
            var errors = new List<string>();
            
            var answersToAdd = new List<SurveyAnswer>();
            var answerFilesToAdd = new List<SurveyAnswerFile>();

            // Phase 3: Reject invalid QuestionIds
            var validQuestionIdSet = validQuestions.Select(q => q.Id).ToHashSet();
            if (request.Answers.Any(a => !validQuestionIdSet.Contains(a.QuestionId)))
                throw new FormfleksBaseApp.Application.Common.BusinessException("Anket şablonuna ait olmayan geçersiz soru gönderildi.");

            foreach (var qEntity in validQuestions.OrderBy(q => q.SortOrder))
            {
                // Visibility evaluation
                bool isVisible = true;
                if (!string.IsNullOrEmpty(qEntity.VisibilityRuleJson))
                {
                    try
                    {
                        using var doc = JsonDocument.Parse(qEntity.VisibilityRuleJson);
                        var root = doc.RootElement;
                        if (root.TryGetProperty("dependsOnQuestionId", out var depIdProp) && Guid.TryParse(depIdProp.GetString(), out var depId))
                        {
                            var operatorType = root.TryGetProperty("operator", out var opProp) ? opProp.GetString() : "equals";
                            var expectedVal = root.TryGetProperty("value", out var valProp) ? valProp.GetString()?.ToLower() ?? "" : "";
                            
                            var depAnswer = request.Answers.FirstOrDefault(a => a.QuestionId == depId);
                            if (depAnswer == null) {
                                isVisible = false;
                            }
                            else 
                            {
                                var depQuestion = validQuestions.FirstOrDefault(q => q.Id == depId);
                                string actualVal = "";
                                if (depQuestion != null)
                                {
                                    if (depQuestion.QuestionType == SurveyQuestionType.ShortText || depQuestion.QuestionType == SurveyQuestionType.LongText || depQuestion.QuestionType == SurveyQuestionType.YesNo)
                                        actualVal = (depAnswer.TextValue ?? "").ToLower();
                                    else if (depQuestion.QuestionType == SurveyQuestionType.SingleChoice || depQuestion.QuestionType == SurveyQuestionType.MultipleChoice)
                                    {
                                        var selected = depQuestion.Options.Where(o => depAnswer.SelectedOptionIds?.Contains(o.Id) == true);
                                        actualVal = string.Join(" ", selected.Select(o => o.Label.ToLower()));
                                    }
                                    else
                                        actualVal = (depAnswer.NumericValue?.ToString() ?? "").ToLower();
                                }

                                if (operatorType == "equals") isVisible = actualVal == expectedVal;
                                else if (operatorType == "notEquals") isVisible = actualVal != expectedVal;
                                else if (operatorType == "contains") isVisible = actualVal.Contains(expectedVal);
                                else isVisible = true;
                            }
                        }
                    }
                    catch { /* default visible on parse error */ }
                }

                if (!isVisible) continue; // Skip hidden questions

                answersDict.TryGetValue(qEntity.Id, out var ans);

                // Check required
                if (qEntity.IsRequired && qEntity.QuestionType != SurveyQuestionType.Info)
                {
                    if (ans == null) 
                    {
                        errors.Add($"Soru '{qEntity.Title}' zorunludur.");
                        continue;
                    }

                    if (qEntity.QuestionType == SurveyQuestionType.ShortText || qEntity.QuestionType == SurveyQuestionType.LongText || qEntity.QuestionType == SurveyQuestionType.YesNo || qEntity.QuestionType == SurveyQuestionType.Date)
                    {
                        if (string.IsNullOrWhiteSpace(ans.TextValue))
                            errors.Add($"Soru '{qEntity.Title}' boş bırakılamaz.");
                    }
                    else if (qEntity.QuestionType == SurveyQuestionType.File)
                    {
                        if (string.IsNullOrWhiteSpace(ans.TextValue) || !ans.TextValue.Contains("\"fileId\""))
                            errors.Add($"Soru '{qEntity.Title}' için dosya yüklemesi zorunludur.");
                    }
                    else if (qEntity.QuestionType == SurveyQuestionType.SingleChoice || qEntity.QuestionType == SurveyQuestionType.MultipleChoice)
                    {
                        if (ans.SelectedOptionIds == null || !ans.SelectedOptionIds.Any())
                            errors.Add($"Soru '{qEntity.Title}' için seçim yapmalısınız.");
                    }
                    else if (qEntity.QuestionType == SurveyQuestionType.Number || qEntity.QuestionType == SurveyQuestionType.Rating || qEntity.QuestionType == SurveyQuestionType.NPS)
                    {
                        if (ans.NumericValue == null)
                            errors.Add($"Soru '{qEntity.Title}' boş bırakılamaz.");
                    }
                }

                if (ans == null) continue;

                // Type-specific validation
                if (qEntity.QuestionType == SurveyQuestionType.SingleChoice)
                {
                    if (ans.SelectedOptionIds != null && ans.SelectedOptionIds.Count > 1)
                        errors.Add($"Soru '{qEntity.Title}' için sadece tek seçenek seçilebilir.");
                }

                if (qEntity.QuestionType == SurveyQuestionType.MultipleChoice && !string.IsNullOrEmpty(qEntity.SettingsJson))
                {
                    try 
                    {
                        using var doc = JsonDocument.Parse(qEntity.SettingsJson);
                        if (doc.RootElement.TryGetProperty("minChoices", out var minProp) && minProp.ValueKind == JsonValueKind.Number)
                        {
                            int minChoices = minProp.GetInt32();
                            if (ans.SelectedOptionIds != null && ans.SelectedOptionIds.Count < minChoices)
                                errors.Add($"Soru '{qEntity.Title}' için en az {minChoices} seçenek seçilebilir.");
                        }
                        if (doc.RootElement.TryGetProperty("maxChoices", out var maxProp) && maxProp.ValueKind == JsonValueKind.Number)
                        {
                            int maxChoices = maxProp.GetInt32();
                            if (ans.SelectedOptionIds != null && ans.SelectedOptionIds.Count > maxChoices)
                                errors.Add($"Soru '{qEntity.Title}' için en fazla {maxChoices} seçenek seçilebilir.");
                        }
                    } 
                    catch { /* Ignore parsing errors */ }
                }

                if (qEntity.QuestionType == SurveyQuestionType.Rating && ans.NumericValue != null && !string.IsNullOrEmpty(qEntity.SettingsJson))
                {
                    try 
                    {
                        using var doc = JsonDocument.Parse(qEntity.SettingsJson);
                        int maxRating = 5;
                        if (doc.RootElement.TryGetProperty("maxRating", out var maxProp) && maxProp.ValueKind == JsonValueKind.Number)
                            maxRating = maxProp.GetInt32();
                        else if (doc.RootElement.TryGetProperty("maxStars", out var maxStarsProp) && maxStarsProp.ValueKind == JsonValueKind.Number)
                            maxRating = maxStarsProp.GetInt32();
                            
                        if (ans.NumericValue > maxRating || ans.NumericValue < 1)
                            errors.Add($"Soru '{qEntity.Title}' için puanlama 1 ile {maxRating} arasında olmalıdır.");
                    }
                    catch { /* Ignore */ }
                }

                if (qEntity.QuestionType == SurveyQuestionType.NPS && ans.NumericValue != null)
                {
                    if (ans.NumericValue < 0 || ans.NumericValue > 10)
                        errors.Add($"Soru '{qEntity.Title}' için NPS değeri 0-10 arasında olmalıdır.");
                }

                if (qEntity.QuestionType == SurveyQuestionType.Number && ans.NumericValue != null && !string.IsNullOrEmpty(qEntity.SettingsJson))
                {
                    try 
                    {
                        using var doc = JsonDocument.Parse(qEntity.SettingsJson);
                        if (doc.RootElement.TryGetProperty("min", out var minProp) && minProp.ValueKind == JsonValueKind.Number && ans.NumericValue < minProp.GetDecimal())
                            errors.Add($"Soru '{qEntity.Title}' için değer en az {minProp.GetDecimal()} olmalıdır.");
                        if (doc.RootElement.TryGetProperty("max", out var maxProp) && maxProp.ValueKind == JsonValueKind.Number && ans.NumericValue > maxProp.GetDecimal())
                            errors.Add($"Soru '{qEntity.Title}' için değer en fazla {maxProp.GetDecimal()} olmalıdır.");
                    }
                    catch { /* Ignore */ }
                }

                if (qEntity.QuestionType == SurveyQuestionType.Matrix)
                {
                    if (string.IsNullOrWhiteSpace(ans.TextValue) && qEntity.IsRequired)
                    {
                        errors.Add($"Soru '{qEntity.Title}' için tüm satırları cevaplamalısınız.");
                        continue;
                    }

                    if (!string.IsNullOrWhiteSpace(ans.TextValue))
                    {
                        Dictionary<string, int> providedAnswers = null;
                        try
                        {
                            providedAnswers = JsonSerializer.Deserialize<Dictionary<string, int>>(ans.TextValue);
                        }
                        catch
                        {
                            errors.Add($"Soru '{qEntity.Title}' geçersiz bir formatta gönderildi.");
                        }

                        if (providedAnswers != null && !string.IsNullOrEmpty(qEntity.SettingsJson))
                        {
                            try
                            {
                                using var doc = JsonDocument.Parse(qEntity.SettingsJson);
                                int expectedRows = 0;
                                int expectedCols = 0;
                                
                                if (doc.RootElement.TryGetProperty("rows", out var rowsProp) && rowsProp.ValueKind == JsonValueKind.Array)
                                    expectedRows = rowsProp.GetArrayLength();
                                    
                                if (doc.RootElement.TryGetProperty("cols", out var colsProp) && colsProp.ValueKind == JsonValueKind.Array)
                                    expectedCols = colsProp.GetArrayLength();

                                // Check required condition
                                if (qEntity.IsRequired && providedAnswers.Count < expectedRows)
                                {
                                    errors.Add($"Soru '{qEntity.Title}' için tüm satırları cevaplamalısınız.");
                                }

                                // Check invalid row keys
                                foreach (var rowKey in providedAnswers.Keys)
                                {
                                    if (!int.TryParse(rowKey, out int rowIdx) || rowIdx < 0 || rowIdx >= expectedRows)
                                    {
                                        errors.Add($"Soru '{qEntity.Title}' geçersiz satır bilgisi içeriyor.");
                                        break;
                                    }
                                }

                                // Check invalid col values
                                foreach (var colVal in providedAnswers.Values)
                                {
                                    if (colVal < 0 || colVal >= expectedCols)
                                    {
                                        errors.Add($"Soru '{qEntity.Title}' geçersiz sütun seçimi içeriyor.");
                                        break;
                                    }
                                }
                            }
                            catch
                            {
                                // If SettingsJson is totally broken, we log but cannot validate properly
                            }
                        }
                    }
                }

                if (qEntity.QuestionType == SurveyQuestionType.Date && !string.IsNullOrWhiteSpace(ans.TextValue))
                {
                    if (!DateTime.TryParse(ans.TextValue, out DateTime parsedDate))
                    {
                        errors.Add($"Soru '{qEntity.Title}' için geçerli bir tarih girilmelidir.");
                    }
                    else if (!string.IsNullOrEmpty(qEntity.SettingsJson))
                    {
                        try 
                        {
                            using var doc = JsonDocument.Parse(qEntity.SettingsJson);
                            if (doc.RootElement.TryGetProperty("minDate", out var minProp) && minProp.ValueKind == JsonValueKind.String)
                            {
                                if (DateTime.TryParse(minProp.GetString(), out DateTime minDate) && parsedDate < minDate.Date)
                                    errors.Add($"Soru '{qEntity.Title}' için tarih en erken {minDate:dd.MM.yyyy} olabilir.");
                            }
                            if (doc.RootElement.TryGetProperty("maxDate", out var maxProp) && maxProp.ValueKind == JsonValueKind.String)
                            {
                                if (DateTime.TryParse(maxProp.GetString(), out DateTime maxDate) && parsedDate > maxDate.Date)
                                    errors.Add($"Soru '{qEntity.Title}' için tarih en geç {maxDate:dd.MM.yyyy} olabilir.");
                            }
                        } 
                        catch { /* Ignore parsing errors */ }
                    }
                }

                if (ans.SelectedOptionIds != null && ans.SelectedOptionIds.Count > 0)
                {
                    var validOptionIds = qEntity.Options.Select(o => o.Id).ToHashSet();
                    if (ans.SelectedOptionIds.Any(id => !validOptionIds.Contains(id)))
                    {
                        errors.Add($"Soru '{qEntity.Title}' geçersiz seçenekler içeriyor.");
                    }
                }

                if (!errors.Any())
                {
                    var detail = new SurveyAnswer
                    {
                        Id = Guid.NewGuid(),
                        SurveyResponseId = response.Id,
                        SurveyVersionQuestionId = ans.QuestionId,
                        ValueText = (qEntity.QuestionType == SurveyQuestionType.File || qEntity.QuestionType == SurveyQuestionType.Matrix) ? null : ans.TextValue,
                        ValueNumber = ans.NumericValue,
                        ValueJson = ans.SelectedOptionIds != null && ans.SelectedOptionIds.Count > 0 ? JsonSerializer.Serialize(ans.SelectedOptionIds) : ((qEntity.QuestionType == SurveyQuestionType.Matrix || qEntity.QuestionType == SurveyQuestionType.File) ? ans.TextValue : null)
                    };
                    answersToAdd.Add(detail);

                    if (qEntity.QuestionType == SurveyQuestionType.File && !string.IsNullOrWhiteSpace(ans.TextValue))
                    {
                        try 
                        {
                            using var doc = JsonDocument.Parse(ans.TextValue);
                            var fileId = doc.RootElement.GetProperty("fileId").GetString() ?? "";
                            
                            // Secure File Validation: Check if the fileId is formatted correctly indicating it was uploaded by THIS token for THIS question.
                            var prefix = $"{assignment.Token:N}_{ans.QuestionId:N}_";
                            if (!fileId.StartsWith(prefix))
                            {
                                errors.Add($"Soru '{qEntity.Title}' için yetkisiz dosya gönderimi engellendi.");
                            }
                            else
                            {
                                var fileRec = new SurveyAnswerFile
                                {
                                    Id = Guid.NewGuid(),
                                    SurveyAnswerId = detail.Id,
                                    FileName = doc.RootElement.GetProperty("fileName").GetString() ?? "file",
                                    ContentType = doc.RootElement.GetProperty("contentType").GetString() ?? "application/octet-stream",
                                    FileSize = doc.RootElement.GetProperty("fileSize").GetInt64(),
                                    FilePath = fileId // Storing just the safe FileId
                                };
                                answerFilesToAdd.Add(fileRec);
                            }
                        }
                        catch { /* skip invalid file payloads */ }
                    }
                }
            }

            if (errors.Any())
            {
                throw new FormfleksBaseApp.Application.Common.BusinessException(string.Join(" ", errors));
            }

            _context.SurveyResponses.Add(response);
            _context.SurveyAnswers.AddRange(answersToAdd);
            _context.SurveyAnswerFiles.AddRange(answerFilesToAdd);

            assignment.Status = SurveyAssignmentStatus.Completed;
            assignment.CompletedAt = DateTime.UtcNow;

            await _context.SaveChangesAsync(cancellationToken);
            await transaction.CommitAsync(cancellationToken);

            return new SubmitSurveyResult(true, receiptCode);
        }
        catch (Microsoft.EntityFrameworkCore.DbUpdateException ex)
        {
            await transaction.RollbackAsync(cancellationToken);
            if (ex.InnerException != null && ex.InnerException.Message.Contains("PK_survey_participation_guards", StringComparison.OrdinalIgnoreCase))
            {
                throw new FormfleksBaseApp.Application.Common.ConflictException("Bu anketi zaten doldurdunuz veya aynı anda başka bir gönderim yapıldı.");
            }
            throw;
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
