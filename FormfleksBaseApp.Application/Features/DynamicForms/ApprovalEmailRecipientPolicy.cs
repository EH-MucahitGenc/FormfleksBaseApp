using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Constants;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms;

/// <summary>
/// Global İK users can act on approvals, but receive approval emails only for probation forms.
/// This policy applies to email delivery, not approval authorization or in-app notifications.
/// </summary>
public static class ApprovalEmailRecipientPolicy
{
    public static async Task<HashSet<Guid>> GetSuppressedGlobalIkUserIdsAsync(
        IDynamicFormsDbContext db,
        string? systemUsageType,
        IEnumerable<Guid> recipientUserIds,
        CancellationToken cancellationToken)
    {
        if (ProbationFormConstants.IsProbationForm(systemUsageType))
            return [];

        var userIds = recipientUserIds.Distinct().ToArray();
        if (userIds.Length == 0)
            return [];

        var globalIkUserIds = await (
            from assignment in db.UserLocationRoles.AsNoTracking()
            join role in db.Roles.AsNoTracking() on assignment.RoleId equals role.Id
            where assignment.IsActive && assignment.IsGlobalManager &&
                  role.Code == "IK" && userIds.Contains(assignment.UserId)
            select assignment.UserId)
            .Distinct()
            .ToListAsync(cancellationToken);

        return globalIkUserIds.ToHashSet();
    }
}
