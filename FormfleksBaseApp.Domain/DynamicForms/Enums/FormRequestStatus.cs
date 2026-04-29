namespace FormfleksBaseApp.DynamicForms.Domain.Enums;

/// <summary>
/// Kullanıcının oluşturduğu form talebinin (Request) genel durumunu belirtir.
/// </summary>
public enum FormRequestStatus
{
    Draft = 1,
    Submitted = 2,
    InApproval = 3,
    Approved = 4,
    Rejected = 5,
    Cancelled = 6,
    ReturnedForRevision = 7
}
