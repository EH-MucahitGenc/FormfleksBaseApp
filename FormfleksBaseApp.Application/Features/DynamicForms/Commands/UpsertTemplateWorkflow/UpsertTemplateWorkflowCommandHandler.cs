using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Linq;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.UpsertTemplateWorkflow;

public sealed class UpsertTemplateWorkflowCommandHandler : IRequestHandler<UpsertTemplateWorkflowCommand, int>
{
    private readonly IDynamicFormsDbContext _db;

    public UpsertTemplateWorkflowCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<int> Handle(UpsertTemplateWorkflowCommand request, CancellationToken ct)
    {
        // Mevcut aktif workflow definition bul
        var oldWfDef = await _db.WorkflowDefinitions
            .FirstOrDefaultAsync(w => w.FormTypeId == request.FormTypeId && w.IsActive, ct);

        WorkflowDefinitionEntity newWfDef;

        if (oldWfDef != null)
        {
            oldWfDef.IsActive = false; // Deactivate old version
            
            newWfDef = new WorkflowDefinitionEntity
            {
                FormTypeId = request.FormTypeId,
                VersionNo = oldWfDef.VersionNo + 1,
                IsActive = true
            };
            _db.WorkflowDefinitions.Add(newWfDef);
        }
        else
        {
            newWfDef = new WorkflowDefinitionEntity
            {
                FormTypeId = request.FormTypeId,
                VersionNo = 1,
                IsActive = true
            };
            _db.WorkflowDefinitions.Add(newWfDef);
        }
        
        await _db.SaveChangesAsync(ct);

        // Yeni adımları yeni workflow ID'sine ekle
        int stepNo = 1;
        foreach (var sDto in request.Steps.OrderBy(x => x.StepNo))
        {
            _db.WorkflowSteps.Add(new WorkflowStepEntity
            {
                WorkflowDefinitionId = newWfDef.Id,
                StepNo = sDto.StepNo,
                Name = sDto.Name ?? $"Adım {sDto.StepNo}",
                AssigneeType = (short)sDto.AssigneeType,
                AssigneeUserId = sDto.AssigneeUserId,
                AssigneeRoleId = sDto.AssigneeRoleId,
                DynamicRuleJson = sDto.DynamicRuleJson,
                AllowReturnForRevision = sDto.AllowReturnForRevision,
                FallbackAction = sDto.FallbackAction,
                FallbackUserId = sDto.FallbackUserId,
                IsParallel = sDto.IsParallel,
                TargetLocationRoleId = sDto.TargetLocationRoleId
            });
            stepNo++;
        }

        return await _db.SaveChangesAsync(ct);
    }
}
