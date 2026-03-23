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

        var approvalStepIds = approvals.Select(a => a.WorkflowStepId).ToList();
        var workflowSteps = await _db.WorkflowSteps
            .AsNoTracking()
            .Where(s => approvalStepIds.Contains(s.Id))
            .ToListAsync(ct);

        var actorUserIds = approvals.Select(a => a.ActionByUserId ?? a.AssigneeUserId).Where(x => x.HasValue).Select(x => x!.Value).ToList();
        var actors = await _db.QdmsPersoneller
            .AsNoTracking()
            .Where(p => p.LinkedUserId.HasValue && actorUserIds.Contains(p.LinkedUserId.Value))
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
            Workflow = approvals.Select(a => {
                string actorName = "Bilinmiyor";

                if (a.ActionByUserId.HasValue || a.AssigneeUserId.HasValue)
                {
                    var targetUserId = a.ActionByUserId ?? a.AssigneeUserId;
                    var actorObj = targetUserId.HasValue ? actors.FirstOrDefault(p => p.LinkedUserId == targetUserId.Value) : null;
                    actorName = actorObj != null ? $"{actorObj.Adi} {actorObj.Soyadi}" : (targetUserId?.ToString() ?? "Bilinmiyor");
                }
                else if (a.AssigneeRoleId.HasValue)
                {
                    var roleObj = roles.FirstOrDefault(r => r.Id == a.AssigneeRoleId.Value);
                    actorName = roleObj != null ? $"Rol: {roleObj.Name}" : $"Rol ID: {a.AssigneeRoleId.Value}";
                }

                return new FormRequestWorkflowStepDto
                {
                    Step = workflowSteps.FirstOrDefault(s => s.Id == a.WorkflowStepId)?.Name ?? $"Adım {a.StepNo}",
                    Status = ((FormRequestStatus)a.Status).ToString(),
                    Actor = actorName,
                    Date = a.ActionAt
                };
            }).ToList()
        };
    }
}
