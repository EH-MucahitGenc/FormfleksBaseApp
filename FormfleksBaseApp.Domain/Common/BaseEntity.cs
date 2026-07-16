namespace FormfleksBaseApp.Domain.Common;

/// <summary>
/// Int tipinde Id'ye sahip olan ve veritabanı kayıt işlemlerinde
/// denetim izini (Audit) tutmak üzere oluşturma/güncelleme/silme yapan kişiyi (Who) ve zamanı (When) barındıran temel sınıf.
/// </summary>
public abstract class BaseEntity
{
    public int Id { get; set; }
    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
    public string CreatedBy { get; set; } = string.Empty;
    public DateTime? UpdatedAt { get; set; }
    public string? UpdatedBy { get; set; }
    public bool IsDeleted { get; set; }
    public DateTime? DeletedAt { get; set; }
    public string? DeletedBy { get; set; }
}
