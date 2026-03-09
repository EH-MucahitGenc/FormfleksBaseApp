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

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.SubmitRequest;

public sealed class SubmitRequestCommandHandler : IRequestHandler<SubmitRequestCommand, FormRequestResultDto>
{
    private readonly IDynamicFormsDbContext _db;

    public SubmitRequestCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<FormRequestResultDto> Handle(SubmitRequestCommand request, CancellationToken ct)
    {
        var dto = request.Request;
        var req = await _db.FormRequests
            .FirstOrDefaultAsync(r => r.Id == dto.RequestId, ct)
            ?? throw new BusinessException("Kayıt bulunamadı.");

        if (req.Status != (short)FormRequestStatus.Draft)
            throw new BusinessException("Sadece taslak (Draft) durumundaki formlar onaya gönderilebilir.");

        // Aktif workflow bul
        var wfDef = await _db.WorkflowDefinitions
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.FormTypeId == req.FormTypeId && w.IsActive, ct);

        if (wfDef is null)
        {
            // Onay rotası yoksa direkt ONAYLANDI yap
            req.Approve((short)FormRequestStatus.Approved);
        }
        else
        {
            var firstStep = await _db.WorkflowSteps
                .AsNoTracking()
                .Where(s => s.WorkflowDefinitionId == wfDef.Id)
                .OrderBy(s => s.StepNo)
                .FirstOrDefaultAsync(ct);

            if (firstStep is null)
            {
                req.Approve((short)FormRequestStatus.Approved);
            }
            else
            {
                req.Submit((short)FormRequestStatus.InApproval);
                req.CurrentStepNo = firstStep.StepNo;

                // Onay adımı kaydı oluştur
                _db.FormRequestApprovals.Add(new FormRequestApprovalEntity
                {
                    RequestId = req.Id,
                    StepNo = firstStep.StepNo,
                    WorkflowStepId = firstStep.Id,
                    Status = (short)FormRequestStatus.InApproval,
                    AssigneeRoleId = firstStep.AssigneeRoleId,
                    AssigneeUserId = firstStep.AssigneeUserId
                });
            }
        }

        _db.AuditLogs.Add(new AuditLogEntity
        {
            EntityType = "FormRequest",
            EntityId = req.Id,
            ActionType = "FormSubmitted",
            ActorUserId = req.RequestorUserId,
            DetailJson = $"{{\"Status\": \"{req.Status}\", \"StepNo\": {req.CurrentStepNo}}}",
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(ct);

        return new FormRequestResultDto
        {
            RequestId = req.Id,
            Status = (FormRequestStatus)req.Status,
            CurrentStepNo = req.CurrentStepNo,
            ConcurrencyToken = req.ConcurrencyToken
        };
    }
}
