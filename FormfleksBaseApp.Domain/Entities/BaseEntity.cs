namespace FormfleksBaseApp.Domain.Entities;

/// <summary>
/// Guid tipinde Id'ye sahip varlıklar (Entity'ler) için temel sınıf.
/// Oluşturulma, güncellenme tarihleri ve aktiflik durumunu (soft delete / active flag) barındırır.
/// </summary>
public abstract class BaseEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();
    public DateTime CreatedAt { get; set; }
    public DateTime? UpdatedAt { get; set; }
    public bool Active { get; set; } = true;
}
