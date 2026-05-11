using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Queries.GetRequestDetailed;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetRequestDetailed;

/// <summary>
/// Sistemde doldurulmuş ve onay sürecine girmiş (veya tamamlanmış) bir formun (talebin) tüm detaylarını getiren Query Handler sınıfıdır.
/// Bu sınıf form içerisindeki verileri (JSON), onay tarihçesini, onay bekleyen kişileri ve formu dolduran kişinin 
/// QdmsPersonel sistemi üzerindeki gerçek Ad-Soyad bilgilerini eşleştirerek UI (Kullanıcı Arayüzü) katmanına sunar.
/// Güvenlik gereği sadece formu dolduran veya onay sürecinde yer alan kişilerin erişimine izin verir.
/// </summary>
public sealed class GetRequestDetailedQueryHandler
    : IRequestHandler<GetRequestDetailedQuery, FormRequestDetailedDto?>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IUserRepository _userRepository;

    public GetRequestDetailedQueryHandler(IDynamicFormsDbContext db, IUserRepository userRepository)
    {
        _db = db;
        _userRepository = userRepository;
    }

    public async Task<FormRequestDetailedDto?> Handle(GetRequestDetailedQuery query, CancellationToken ct)
    {
        var request = await _db.FormRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == query.RequestId, ct);

        if (request is null)
            return null;

        bool isAuthorized = request.RequestorUserId == query.RequestorUserId;

        // If not the creator, check if they are an assigned approver
        if (!isAuthorized)
        {
            var userRoleIds = await _db.UserRoles
                .AsNoTracking()
                .Where(ur => ur.UserId == query.RequestorUserId)
                .Select(ur => ur.RoleId)
                .ToListAsync(ct);

            bool isApprover = await _db.FormRequestApprovals
                .AnyAsync(a => a.RequestId == query.RequestId && 
                    (
                        a.AssigneeUserId == query.RequestorUserId || 
                        a.ActionByUserId == query.RequestorUserId ||
                        (a.AssigneeRoleId.HasValue && userRoleIds.Contains(a.AssigneeRoleId.Value))
                    ), ct);
            
            if (!isApprover)
                return null; // 404 Not Found (Unauthorized)
        }

        var formType = await _db.FormTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == request.FormTypeId, ct);

        var values = await _db.FormRequestValues
            .AsNoTracking()
            .Where(x => x.RequestId == query.RequestId)
            .ToListAsync(ct);

        var formFields = await _db.FormFields
            .AsNoTracking()
            .Where(x => x.FormTypeId == request.FormTypeId)
            .ToListAsync(ct);

        var approvals = await _db.FormRequestApprovals
            .AsNoTracking()
            .Where(x => x.RequestId == query.RequestId)
            .OrderBy(x => x.StepNo)
            .ToListAsync(ct);

        Guid? resolvedWfDefId = null;
        var firstApproval = approvals.FirstOrDefault();
        if (firstApproval != null)
        {
            var step = await _db.WorkflowSteps.AsNoTracking().FirstOrDefaultAsync(s => s.Id == firstApproval.WorkflowStepId, ct);
            if (step != null)
            {
                resolvedWfDefId = step.WorkflowDefinitionId;
            }
        }

        var wfDef = resolvedWfDefId.HasValue 
            ? await _db.WorkflowDefinitions.AsNoTracking().FirstOrDefaultAsync(w => w.Id == resolvedWfDefId.Value, ct)
            : await _db.WorkflowDefinitions.AsNoTracking().OrderByDescending(w => w.VersionNo).FirstOrDefaultAsync(w => w.FormTypeId == request.FormTypeId, ct);

        var allWorkflowSteps = new List<FormfleksBaseApp.Domain.Entities.DynamicForms.WorkflowStepEntity>();
        if (wfDef != null)
        {
            allWorkflowSteps = await _db.WorkflowSteps
                .AsNoTracking()
                .Where(s => s.WorkflowDefinitionId == wfDef.Id)
                .OrderBy(s => s.StepNo)
                .ToListAsync(ct);
        }
        else 
        {
            var approvalStepIds = approvals.Select(a => a.WorkflowStepId).ToList();
            allWorkflowSteps = await _db.WorkflowSteps
                .AsNoTracking()
                .Where(s => approvalStepIds.Contains(s.Id))
                .OrderBy(s => s.StepNo)
                .ToListAsync(ct);
        }

        var actorUserIds = approvals.Select(a => a.ActionByUserId ?? a.AssigneeUserId).Where(x => x.HasValue).Select(x => x!.Value).ToList();
        var actors = await _db.QdmsPersoneller
            .AsNoTracking()
            .Where(p => p.LinkedUserId.HasValue && (actorUserIds.Contains(p.LinkedUserId.Value) || p.LinkedUserId.Value == request.RequestorUserId))
            .ToListAsync(ct);

        var actorRoleIds = approvals.Select(a => a.AssigneeRoleId).Where(x => x.HasValue).Select(x => x!.Value).ToList();
        var roles = await _db.Roles
            .AsNoTracking()
            .Where(r => actorRoleIds.Contains(r.Id))
            .ToListAsync(ct);

        string requestorName = "Bilinmeyen Kullanıcı";
        var reqActorObj = actors.FirstOrDefault(p => p.LinkedUserId == request.RequestorUserId);
        if (reqActorObj != null)
        {
            requestorName = $"{reqActorObj.Adi} {reqActorObj.Soyadi}";
        }
        else
        {
            var reqAppUser = await _userRepository.GetByIdAsync(request.RequestorUserId, ct, false);
            if (reqAppUser != null && !string.IsNullOrWhiteSpace(reqAppUser.DisplayName))
            {
                requestorName = reqAppUser.DisplayName;
            }
            else
            {
                requestorName = request.RequestorUserId.ToString();
            }
        }

        var auditLogs = await _db.AuditLogs
            .AsNoTracking()
            .Where(a => a.EntityType == "FormRequest" && a.EntityId == request.Id && a.ActionType == "FormSubmitted")
            .OrderBy(a => a.CreatedAt)
            .ToListAsync(ct);

        var timeline = new List<FormRequestWorkflowStepDto>();

        bool isFirstSubmit = true;
        foreach (var log in auditLogs)
        {
            timeline.Add(new FormRequestWorkflowStepDto {
                Step = isFirstSubmit ? "Formun Gönderilmesi" : "Formun Revize Edilmesi",
                Status = isFirstSubmit ? "Submitted" : "Revised",
                Actor = requestorName,
                Date = log.CreatedAt
            });
            isFirstSubmit = false;
        }

        if (timeline.Count == 0)
        {
            timeline.Add(new FormRequestWorkflowStepDto {
                Step = "Formun Gönderilmesi",
                Status = "Submitted",
                Actor = requestorName,
                Date = request.CreatedAt
            });
        }

        foreach (var app in approvals.OrderBy(a => a.ActionAt.HasValue ? 0 : 1).ThenBy(a => a.ActionAt).ThenBy(a => a.StepNo))
        {
            var ws = allWorkflowSteps.FirstOrDefault(s => s.Id == app.WorkflowStepId);
            string actorName = "Bilinmiyor";

            if (app.ActionByUserId.HasValue || app.AssigneeUserId.HasValue)
            {
                var targetUserId = app.ActionByUserId ?? app.AssigneeUserId;
                var actorObj = targetUserId.HasValue ? actors.FirstOrDefault(p => p.LinkedUserId == targetUserId.Value) : null;
                
                if (actorObj != null)
                {
                    actorName = $"{actorObj.Adi} {actorObj.Soyadi}";
                }
                else if (targetUserId.HasValue)
                {
                    var appUser = await _userRepository.GetByIdAsync(targetUserId.Value, ct, false);
                    if (appUser != null && !string.IsNullOrWhiteSpace(appUser.DisplayName))
                        actorName = appUser.DisplayName;
                    else
                        actorName = targetUserId.Value.ToString();
                }
            }
            else if (app.AssigneeRoleId.HasValue)
            {
                var roleObj = roles.FirstOrDefault(r => r.Id == app.AssigneeRoleId.Value);
                actorName = roleObj != null ? $"Rol: {roleObj.Name}" : $"Rol ID: {app.AssigneeRoleId.Value}";
            }

            timeline.Add(new FormRequestWorkflowStepDto
            {
                Step = ws?.Name ?? $"Adım {app.StepNo}",
                Status = ((ApprovalStatus)app.Status).ToString(),
                Actor = actorName,
                Date = app.ActionAt,
                Comment = app.ActionComment
            });
        }

        // Sort all executed/past events chronologically
        var pastEvents = timeline.Where(t => t.Date.HasValue).OrderBy(t => t.Date).ToList();
        var futureEvents = timeline.Where(t => !t.Date.HasValue).ToList();
        
        timeline = pastEvents.Concat(futureEvents).ToList();

        // Add Future Steps
        // Find the currently active or last active step
        var currentActiveApp = approvals.OrderByDescending(a => a.StepNo).FirstOrDefault(a => !a.ActionAt.HasValue);
        var lastCompletedApp = approvals.OrderByDescending(a => a.ActionAt).FirstOrDefault(a => a.ActionAt.HasValue);
        
        if (request.Status == (short)FormRequestStatus.InApproval || request.Status == (short)FormRequestStatus.Draft)
        {
            int currentStepNo = currentActiveApp?.StepNo ?? lastCompletedApp?.StepNo ?? 0;
            var futureSteps = allWorkflowSteps.Where(s => s.StepNo > currentStepNo).OrderBy(s => s.StepNo);
            foreach (var fs in futureSteps)
            {
                timeline.Add(new FormRequestWorkflowStepDto
                {
                    Step = fs.Name ?? $"Adım {fs.StepNo}",
                    Status = "Future",
                    Actor = "Bekleniyor",
                    Date = null
                });
            }
        }

        return new FormRequestDetailedDto
        {
            RequestId = request.Id,
            RequestNo = request.RequestNo,
            FormTypeCode = formType?.Code ?? "",
            FormTypeName = formType?.Name ?? "",
            Status = (FormRequestStatus)request.Status,
            ConcurrencyToken = request.ConcurrencyToken,
            Values = formFields
                .OrderBy(f => f.SortOrder)
                .Select(f => {
                    var v = values.FirstOrDefault(val => string.Equals(val.FieldKey, f.FieldKey, StringComparison.OrdinalIgnoreCase));
                    string? computedValue = v?.ValueText
                        ?? v?.ValueNumber?.ToString()
                        ?? v?.ValueDateTime?.ToString("O")
                        ?? v?.ValueBool?.ToString().ToLowerInvariant()
                        ?? v?.ValueJson;

                    if (!string.IsNullOrWhiteSpace(f.OptionsJson) && !string.IsNullOrWhiteSpace(computedValue) && f.FieldType != 11)
                    {
                            try 
                            {
                                using var doc = System.Text.Json.JsonDocument.Parse(f.OptionsJson);
                                if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                                {
                                    string searchVal = computedValue;
                                    int? searchIdx = null;
                                    
                                    if (decimal.TryParse(computedValue.Replace(",", "."), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var decVal))
                                    {
                                        if (decVal % 1 == 0) 
                                        {
                                            searchVal = ((int)decVal).ToString();
                                            searchIdx = (int)decVal;
                                        }
                                    }

                                    int idx = 0;
                                    foreach (var item in doc.RootElement.EnumerateArray())
                                    {
                                        if (item.ValueKind == System.Text.Json.JsonValueKind.String)
                                        {
                                            string? strVal = item.GetString();
                                            if (searchVal == strVal || (searchIdx.HasValue && searchIdx.Value == idx))
                                            {
                                                computedValue = strVal;
                                                break;
                                            }
                                        }
                                        else if (item.ValueKind == System.Text.Json.JsonValueKind.Object)
                                        {
                                            string? optId = item.TryGetProperty("id", out var idProp) ? idProp.ToString() : 
                                                            item.TryGetProperty("Id", out var idProp2) ? idProp2.ToString() : null;
                                            
                                            string? optName = item.TryGetProperty("name", out var nameProp) ? nameProp.GetString() : 
                                                              item.TryGetProperty("Name", out var nameProp2) ? nameProp2.GetString() : 
                                                              item.TryGetProperty("text", out var textProp) ? textProp.GetString() : 
                                                              item.TryGetProperty("Text", out var textProp2) ? textProp2.GetString() : 
                                                              item.TryGetProperty("value", out var valProp) ? valProp.GetString() : 
                                                              item.TryGetProperty("Value", out var valProp2) ? valProp2.GetString() : null;

                                            if (optId == searchVal || optId == computedValue || (searchIdx.HasValue && searchIdx.Value == idx && string.IsNullOrEmpty(optId)))
                                            {
                                                computedValue = optName ?? computedValue;
                                                break;
                                            }
                                        }
                                        idx++;
                                    }
                                }
                            }
                            catch (Exception)
                            {
                                try 
                                {
                                    var fallbackParts = f.OptionsJson.Split(',').Select(s => s.Trim()).ToList();
                                    string searchVal = computedValue;
                                    int? searchIdx = null;
                                    if (decimal.TryParse(computedValue.Replace(",", "."), System.Globalization.NumberStyles.Any, System.Globalization.CultureInfo.InvariantCulture, out var decVal))
                                    {
                                        if (decVal % 1 == 0) 
                                        {
                                            searchVal = ((int)decVal).ToString();
                                            searchIdx = (int)decVal;
                                        }
                                    }

                                    for(int i = 0; i < fallbackParts.Count; i++)
                                    {
                                        if (searchVal == fallbackParts[i] || (searchIdx.HasValue && searchIdx.Value == i))
                                        {
                                            computedValue = fallbackParts[i];
                                            break;
                                        }
                                    }
                                } 
                                catch { }
                            }
                        }
                        
                        if (!string.IsNullOrWhiteSpace(computedValue) && computedValue.Contains("T") && DateTime.TryParse(computedValue, null, System.Globalization.DateTimeStyles.RoundtripKind, out var dt))
                        {
                            if (f.FieldType == 4 || f.FieldType == 5)
                                computedValue = dt.ToLocalTime().ToString("dd.MM.yyyy");
                            else if (f.FieldType == 6)
                                computedValue = dt.ToLocalTime().ToString("HH:mm");
                            else 
                                computedValue = dt.ToLocalTime().ToString("dd.MM.yyyy HH:mm");
                        }

                    return new FormRequestValueDto
                    {
                        FieldKey = f.FieldKey,
                        Label = f.Label ?? f.FieldKey,
                        FieldType = f.FieldType,
                        OptionsJson = f.OptionsJson,
                        ValueText = computedValue
                    };
                }).ToList(),
            Workflow = timeline
        };
    }
}
