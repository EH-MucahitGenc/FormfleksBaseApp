namespace FormfleksBaseApp.DynamicForms.Domain.Enums;

/// <summary>
/// İş akışındaki her bir onay adımının güncel durumunu belirtir.
/// </summary>
public enum ApprovalStatus
{
    Pending = 1,
    Approved = 2,
    Rejected = 3,
    ReturnedForRevision = 4,
    Skipped = 5
}
