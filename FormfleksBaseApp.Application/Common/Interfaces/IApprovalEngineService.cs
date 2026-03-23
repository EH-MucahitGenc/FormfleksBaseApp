using System;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Domain.Entities.DynamicForms;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IApprovalEngineService
{
    /// <summary>
    /// Computes the next valid step in the workflow, automatically skipping steps
    /// that evaluate as self-approvals or where a dynamic manager cannot be resolved.
    /// </summary>
    Task<(WorkflowStepEntity? Step, Guid? AssigneeUserId, Guid? AssigneeRoleId)> ResolveNextValidStepAsync(
        Guid workflowDefinitionId, 
        int currentStepNo, 
        Guid requestorUserId, 
        CancellationToken ct);
}
