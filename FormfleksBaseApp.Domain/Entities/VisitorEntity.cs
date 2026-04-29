using FormfleksBaseApp.Domain.Common;

namespace FormfleksBaseApp.Domain.Entities;

/// <summary>
/// Sistemdeki ziyaretçi kayıtlarını temsil eden varlık (Entity).
/// </summary>
public sealed class VisitorEntity : BaseEntity
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public DateTime VisitDate { get; set; }
}
