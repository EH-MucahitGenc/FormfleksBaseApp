using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetTemplateWorkflow;

public sealed class GetTemplateWorkflowQueryHandler : IRequestHandler<GetTemplateWorkflowQuery, IReadOnlyList<FormTemplateWorkflowStepUpsertDto>>
{
    private readonly IDynamicFormsDbContext _db;

    public GetTemplateWorkflowQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<FormTemplateWorkflowStepUpsertDto>> Handle(GetTemplateWorkflowQuery request, CancellationToken ct)
    {
        // Aktif workflow definition bul
        var wfDef = await _db.WorkflowDefinitions
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.FormTypeId == request.FormTypeId && w.IsActive, ct);

        if (wfDef is null) return new List<FormTemplateWorkflowStepUpsertDto>();

        var steps = await _db.WorkflowSteps
            .AsNoTracking()
            .Where(s => s.WorkflowDefinitionId == wfDef.Id)
            .OrderBy(s => s.StepNo)
            .ToListAsync(ct);

        return steps.Select(s => new FormTemplateWorkflowStepUpsertDto
        {
            StepNo = s.StepNo,
            Name = s.Name,
            AssigneeType = s.AssigneeType,
            AssigneeUserId = s.AssigneeUserId,
            AssigneeRoleId = s.AssigneeRoleId,
            DynamicRuleJson = s.DynamicRuleJson,
            AllowReturnForRevision = s.AllowReturnForRevision,
            FallbackAction = s.FallbackAction,
            FallbackUserId = s.FallbackUserId,
            IsParallel = s.IsParallel
        }).ToList();
    }
}
