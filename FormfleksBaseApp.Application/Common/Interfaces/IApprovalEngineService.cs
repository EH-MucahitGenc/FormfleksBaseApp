using System;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Domain.Entities.DynamicForms;

using System.Collections.Generic;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IApprovalEngineService
{
    /// <summary>
    /// Computes the next valid step in the workflow, automatically skipping steps
    /// that evaluate as self-approvals or where a dynamic manager cannot be resolved.
    /// Returns the skipped steps along with their reasons so they can be logged.
    /// </summary>
    Task<(WorkflowStepEntity? Step, Guid? AssigneeUserId, Guid? AssigneeRoleId, List<(WorkflowStepEntity Step, string Reason)> SkippedSteps)> ResolveNextValidStepAsync(
        Guid workflowDefinitionId, 
        int currentStepNo, 
        Guid requestorUserId, 
        Guid formRequestId,
        List<FormfleksBaseApp.DynamicForms.Business.Contracts.ManualWorkflowAssignmentDto>? manualAssignments = null,
        CancellationToken ct = default);
}
