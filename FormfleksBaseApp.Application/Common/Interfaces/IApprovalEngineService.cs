using System;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Domain.Entities.DynamicForms;

using System.Collections.Generic;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IApprovalEngineService
{
    /// <summary>
    /// İş akışındaki bir sonraki geçerli adımı hesaplar. Kendini onaylama (self-approval) gibi durumlara takılan
    /// veya atanacak bir yönetici/rol bulunamayan adımları otomatik olarak atlar.
    /// Atlanan adımları ve atlanma nedenlerini loglanabilmesi için liste halinde döndürür.
    /// </summary>
    Task<(WorkflowStepEntity? Step, Guid? AssigneeUserId, Guid? AssigneeRoleId, List<(WorkflowStepEntity Step, string Reason)> SkippedSteps)> ResolveNextValidStepAsync(
        Guid workflowDefinitionId, 
        int currentStepNo, 
        Guid requestorUserId, 
        Guid formRequestId,
        List<FormfleksBaseApp.DynamicForms.Business.Contracts.ManualWorkflowAssignmentDto>? manualAssignments = null,
        CancellationToken ct = default);
}
