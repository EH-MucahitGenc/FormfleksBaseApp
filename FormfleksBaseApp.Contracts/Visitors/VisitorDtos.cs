namespace FormfleksBaseApp.Contracts.Visitors;

/// <summary>
/// Ziyaretçi bilgilerini listeleme ve okuma işlemlerinde kullanılan dışa açık veri transfer objesi (DTO).
/// </summary>
public sealed class VisitorDto
{
    public Guid Id { get; set; }
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public DateTime VisitDate { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Yeni bir ziyaretçi kaydı oluşturmak için istemciden beklenen veri modeli.
/// </summary>
public sealed class CreateVisitorRequestDto
{
    public string FirstName { get; set; } = string.Empty;
    public string LastName { get; set; } = string.Empty;
    public string CompanyName { get; set; } = string.Empty;
    public string Purpose { get; set; } = string.Empty;
    public DateTime VisitDate { get; set; }
}
