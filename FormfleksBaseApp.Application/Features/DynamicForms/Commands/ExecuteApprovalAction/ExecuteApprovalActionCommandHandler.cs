using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.ExecuteApprovalAction;

public sealed class ExecuteApprovalActionCommandHandler : IRequestHandler<ExecuteApprovalActionCommand, ApprovalActionResponseDto>
{
    private readonly IDynamicFormsDbContext _db;

    public ExecuteApprovalActionCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<ApprovalActionResponseDto> Handle(ExecuteApprovalActionCommand request, CancellationToken ct)
    {
        var reqDto = request.Request;
        var req = await _db.FormRequests
            .FirstOrDefaultAsync(r => r.Id == reqDto.RequestId, ct)
            ?? throw new BusinessException("Kayıt bulunamadı.");

        if (req.Status != (short)FormRequestStatus.InApproval)
            throw new BusinessException("Bu kayıt şu an onay bekleyen statüde değil.");

        // Workflow tanımını bul
        var wfDef = await _db.WorkflowDefinitions
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.FormTypeId == req.FormTypeId && w.IsActive, ct)
            ?? throw new BusinessException("Onay rotası bulunamadı.");

        var currentStep = await _db.WorkflowSteps
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.WorkflowDefinitionId == wfDef.Id && s.StepNo == req.CurrentStepNo, ct)
            ?? throw new BusinessException("Geçersiz onay adımı durumu.");

        // Yetki kontrolü
        var userRoleIds = await _db.UserRoles
            .AsNoTracking()
            .Where(ur => ur.UserId == reqDto.ActorUserId)
            .Select(ur => ur.RoleId)
            .ToListAsync(ct);

        if (!currentStep.AssigneeRoleId.HasValue || !userRoleIds.Contains(currentStep.AssigneeRoleId.Value))
            throw new BusinessException("Bu dokümanı şu anki kademede onaylama/reddetme yetkiniz bulunmuyor.");

        // Onay kaydını güncelle
        var approval = await _db.FormRequestApprovals
            .FirstOrDefaultAsync(a => a.RequestId == req.Id && a.StepNo == req.CurrentStepNo, ct);

        if (approval is not null)
        {
            approval.ActionByUserId = reqDto.ActorUserId;
            approval.ActionComment = reqDto.Comment;
            approval.ActionAt = DateTime.UtcNow;
        }

        if (reqDto.ActionType == ApprovalActionType.Reject)
        {
            req.Reject((short)FormRequestStatus.Rejected);

            if (approval is not null)
                approval.Status = (short)FormRequestStatus.Rejected;
        }
        else if (reqDto.ActionType == ApprovalActionType.ReturnForRevision)
        {
            req.ReturnForRevision((short)FormRequestStatus.ReturnedForRevision);

            if (approval is not null)
                approval.Status = (short)FormRequestStatus.ReturnedForRevision;
        }
        else // Approve
        {
            if (approval is not null)
                approval.Status = (short)FormRequestStatus.Approved;

            // Sonraki adımı bul
            var nextStep = await _db.WorkflowSteps
                .AsNoTracking()
                .Where(s => s.WorkflowDefinitionId == wfDef.Id && s.StepNo > req.CurrentStepNo)
                .OrderBy(s => s.StepNo)
                .FirstOrDefaultAsync(ct);

            if (nextStep is null)
            {
                req.Approve((short)FormRequestStatus.Approved);
            }
            else
            {
                req.CurrentStepNo = nextStep.StepNo;

                // Yeni adim icin approval kaydi
                _db.FormRequestApprovals.Add(new FormRequestApprovalEntity
                {
                    RequestId = req.Id,
                    StepNo = nextStep.StepNo,
                    WorkflowStepId = nextStep.Id,
                    Status = (short)FormRequestStatus.InApproval,
                    AssigneeRoleId = nextStep.AssigneeRoleId,
                    AssigneeUserId = nextStep.AssigneeUserId
                });
            }
        }

        _db.AuditLogs.Add(new AuditLogEntity
        {
            EntityType = "FormRequestApproval",
            EntityId = req.Id,
            ActionType = reqDto.ActionType == ApprovalActionType.Approve ? "Approved" :
                         reqDto.ActionType == ApprovalActionType.Reject ? "Rejected" : "ReturnedForRevision",
            ActorUserId = reqDto.ActorUserId,
            DetailJson = $"{{\"Comment\": \"{reqDto.Comment}\", \"StepNo\": {req.CurrentStepNo}}}",
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(ct);

        return new ApprovalActionResponseDto { Success = true };
    }
}
