using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms;

/// <summary>
/// Resolves the location used by location-based approval steps. A saved location
/// keeps the approval route stable when personnel records change later.
/// </summary>
public static class FormRequestApprovalLocation
{
    public static async Task<string?> ResolveAsync(
        IDynamicFormsDbContext db,
        FormRequestEntity request,
        CancellationToken cancellationToken,
        Guid? currentApproverUserId = null)
    {
        if (!string.IsNullOrWhiteSpace(request.ApprovalLocationName))
            return request.ApprovalLocationName;

        var requestorLocation = await GetPersonnelLocationAsync(db, request.RequestorUserId, cancellationToken);
        if (requestorLocation is not null)
            return requestorLocation;

        var firstLocationStepNo = await (
            from step in db.WorkflowSteps.AsNoTracking()
            join definition in db.WorkflowDefinitions.AsNoTracking()
                on step.WorkflowDefinitionId equals definition.Id
            where definition.FormTypeId == request.FormTypeId && definition.IsActive &&
                  step.AssigneeType == (short)WorkflowAssigneeType.LocationBasedRole
            orderby step.StepNo
            select (int?)step.StepNo)
            .FirstOrDefaultAsync(cancellationToken);
        if (!firstLocationStepNo.HasValue)
            return null;

        var firstManualApproverId = await db.FormRequestManualAssignments.AsNoTracking()
            .Where(assignment => assignment.FormRequestId == request.Id &&
                                 assignment.StepNo < firstLocationStepNo.Value &&
                                 assignment.AssigneeUserId.HasValue)
            .OrderBy(assignment => assignment.StepNo)
            .Select(assignment => assignment.AssigneeUserId)
            .FirstOrDefaultAsync(cancellationToken);
        if (firstManualApproverId.HasValue)
        {
            var manualApproverLocation = await GetPersonnelLocationAsync(db, firstManualApproverId.Value, cancellationToken);
            if (manualApproverLocation is not null)
                return manualApproverLocation;
        }

        var firstApprovedUserId = await db.FormRequestApprovals.AsNoTracking()
            .Where(approval => approval.RequestId == request.Id &&
                               approval.StepNo < firstLocationStepNo.Value &&
                               approval.Status == (short)ApprovalStatus.Approved &&
                               approval.ActionByUserId.HasValue)
            .OrderBy(approval => approval.StepNo)
            .Select(approval => approval.ActionByUserId)
            .FirstOrDefaultAsync(cancellationToken);
        if (firstApprovedUserId.HasValue)
        {
            var approverLocation = await GetPersonnelLocationAsync(db, firstApprovedUserId.Value, cancellationToken);
            if (approverLocation is not null)
                return approverLocation;
        }

        return currentApproverUserId.HasValue
            ? await GetPersonnelLocationAsync(db, currentApproverUserId.Value, cancellationToken)
            : null;
    }

    private static Task<string?> GetPersonnelLocationAsync(
        IDynamicFormsDbContext db, Guid userId, CancellationToken cancellationToken) =>
        db.QdmsPersoneller.AsNoTracking()
            .Where(person => person.LinkedUserId == userId && person.IsActive &&
                             person.Isyeri_Tanimi != null && person.Isyeri_Tanimi != "")
            .OrderByDescending(person => person.LastSyncDate)
            .Select(person => person.Isyeri_Tanimi)
            .FirstOrDefaultAsync(cancellationToken);
}
