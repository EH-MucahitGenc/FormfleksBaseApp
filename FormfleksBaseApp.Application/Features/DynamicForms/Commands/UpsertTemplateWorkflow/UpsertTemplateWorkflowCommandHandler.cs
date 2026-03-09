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
        // Mevcut aktif workflow definition bul veya oluştur
        var wfDef = await _db.WorkflowDefinitions
            .FirstOrDefaultAsync(w => w.FormTypeId == request.FormTypeId && w.IsActive, ct);

        if (wfDef is null)
        {
            wfDef = new WorkflowDefinitionEntity
            {
                FormTypeId = request.FormTypeId,
                VersionNo = 1,
                IsActive = true
            };
            _db.WorkflowDefinitions.Add(wfDef);
            await _db.SaveChangesAsync(ct);
        }

        // Eski adımları sil
        var existingSteps = await _db.WorkflowSteps
            .Where(s => s.WorkflowDefinitionId == wfDef.Id)
            .ToListAsync(ct);
        _db.WorkflowSteps.RemoveRange(existingSteps);

        // Yeni adımları ekle
        int stepNo = 1;
        foreach (var sDto in request.Steps.OrderBy(x => x.StepNo))
        {
            _db.WorkflowSteps.Add(new WorkflowStepEntity
            {
                WorkflowDefinitionId = wfDef.Id,
                StepNo = sDto.StepNo,
                Name = sDto.Name ?? $"Adım {sDto.StepNo}",
                AssigneeType = (short)sDto.AssigneeType,
                AssigneeUserId = sDto.AssigneeUserId,
                AssigneeRoleId = sDto.AssigneeRoleId,
                DynamicRuleJson = sDto.DynamicRuleJson,
                AllowReturnForRevision = sDto.AllowReturnForRevision
            });
            stepNo++;
        }

        return await _db.SaveChangesAsync(ct);
    }
}
