using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Queries.GetRequestDetailed;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetRequestDetailed;

public sealed class GetRequestDetailedQueryHandler
    : IRequestHandler<GetRequestDetailedQuery, FormRequestDetailedDto?>
{
    private readonly IDynamicFormsDbContext _db;

    public GetRequestDetailedQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<FormRequestDetailedDto?> Handle(GetRequestDetailedQuery query, CancellationToken ct)
    {
        var request = await _db.FormRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(x => x.Id == query.RequestId, ct);

        if (request is null || request.RequestorUserId != query.RequestorUserId)
            return null;

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

        var wfDef = await _db.WorkflowDefinitions
            .AsNoTracking()
            .OrderByDescending(w => w.VersionNo)
            .FirstOrDefaultAsync(w => w.FormTypeId == request.FormTypeId, ct);

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

        return new FormRequestDetailedDto
        {
            RequestId = request.Id,
            RequestNo = request.RequestNo,
            FormTypeCode = formType?.Code ?? "",
            FormTypeName = formType?.Name ?? "",
            Status = (FormRequestStatus)request.Status,
            ConcurrencyToken = request.ConcurrencyToken,
            Values = values.Select(v => new FormRequestValueDto
            {
                FieldKey = v.FieldKey,
                Label = formFields.FirstOrDefault(f => f.FieldKey == v.FieldKey)?.Label ?? v.FieldKey,
                ValueText = v.ValueText
                    ?? v.ValueNumber?.ToString()
                    ?? v.ValueDateTime?.ToString("O")
                    ?? v.ValueBool?.ToString().ToLowerInvariant()
            }).ToList(),
            Workflow = new List<FormRequestWorkflowStepDto> {
                new FormRequestWorkflowStepDto {
                    Step = "Formun Gönderilmesi",
                    Status = "Submitted",
                    Actor = actors.FirstOrDefault(p => p.LinkedUserId == request.RequestorUserId) != null 
                        ? $"{actors.First(p => p.LinkedUserId == request.RequestorUserId).Adi} {actors.First(p => p.LinkedUserId == request.RequestorUserId).Soyadi}" 
                        : "Bilinmeyen Kullanıcı",
                    Date = request.CreatedAt
                }
            }.Concat(allWorkflowSteps.Select(ws => {
                var matchingApproval = approvals.FirstOrDefault(a => a.WorkflowStepId == ws.Id);
                if (matchingApproval != null)
                {
                    string actorName = "Bilinmiyor";

                    if (matchingApproval.ActionByUserId.HasValue || matchingApproval.AssigneeUserId.HasValue)
                    {
                        var targetUserId = matchingApproval.ActionByUserId ?? matchingApproval.AssigneeUserId;
                        var actorObj = targetUserId.HasValue ? actors.FirstOrDefault(p => p.LinkedUserId == targetUserId.Value) : null;
                        actorName = actorObj != null ? $"{actorObj.Adi} {actorObj.Soyadi}" : (targetUserId?.ToString() ?? "Bilinmiyor");
                    }
                    else if (matchingApproval.AssigneeRoleId.HasValue)
                    {
                        var roleObj = roles.FirstOrDefault(r => r.Id == matchingApproval.AssigneeRoleId.Value);
                        actorName = roleObj != null ? $"Rol: {roleObj.Name}" : $"Rol ID: {matchingApproval.AssigneeRoleId.Value}";
                    }

                    return new FormRequestWorkflowStepDto
                    {
                        Step = ws.Name ?? $"Adım {matchingApproval.StepNo}",
                        Status = ((ApprovalStatus)matchingApproval.Status).ToString(),
                        Actor = actorName,
                        Date = matchingApproval.ActionAt
                    };
                }
                else
                {
                    return new FormRequestWorkflowStepDto
                    {
                        Step = ws.Name ?? $"Adım {ws.StepNo}",
                        Status = "Future",
                        Actor = "Bekleniyor",
                        Date = null
                    };
                }
            })).Concat(approvals.Where(a => !allWorkflowSteps.Any(ws => ws.Id == a.WorkflowStepId)).Select(matchingApproval => {
                string actorName = "Bilinmiyor";

                if (matchingApproval.ActionByUserId.HasValue || matchingApproval.AssigneeUserId.HasValue)
                {
                    var targetUserId = matchingApproval.ActionByUserId ?? matchingApproval.AssigneeUserId;
                    var actorObj = targetUserId.HasValue ? actors.FirstOrDefault(p => p.LinkedUserId == targetUserId.Value) : null;
                    actorName = actorObj != null ? $"{actorObj.Adi} {actorObj.Soyadi}" : (targetUserId?.ToString() ?? "Bilinmiyor");
                }
                else if (matchingApproval.AssigneeRoleId.HasValue)
                {
                    var roleObj = roles.FirstOrDefault(r => r.Id == matchingApproval.AssigneeRoleId.Value);
                    actorName = roleObj != null ? $"Rol: {roleObj.Name}" : $"Rol ID: {matchingApproval.AssigneeRoleId.Value}";
                }

                return new FormRequestWorkflowStepDto
                {
                    Step = $"Eski Adım {matchingApproval.StepNo}",
                    Status = ((ApprovalStatus)matchingApproval.Status).ToString(),
                    Actor = actorName,
                    Date = matchingApproval.ActionAt
                };
            })).ToList()
        };
    }
}
