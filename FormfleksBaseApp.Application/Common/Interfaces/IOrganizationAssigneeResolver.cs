using FormfleksBaseApp.Domain.Entities.Admin;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public sealed record OrganizationAssigneeCandidate(
    Guid PersonnelId,
    Guid? UserId,
    string Name,
    string? Email);

public sealed record OrganizationAssigneeResolution(
    IReadOnlyList<OrganizationAssigneeCandidate> Candidates,
    string? FailureReason)
{
    public bool IsSuccess => Candidates.Count > 0;
}

public interface IOrganizationAssigneeResolver
{
    Task<OrganizationAssigneeResolution> ResolveManagerLevelAsync(
        QdmsPersonelAktarim subject,
        int eligibleManagerLevel,
        CancellationToken cancellationToken);

    Task<bool> IsEligibleAssigneeAsync(Guid userId, CancellationToken cancellationToken);
}
