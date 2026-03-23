using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Domain.Entities.Admin;

public class QdmsPersonelAktarim : BaseEntity
{
    public string Sirket { get; set; } = default!;
    public string? Isyeri_Kodu { get; set; }
    public string? Isyeri_Tanimi { get; set; }
    public string? Grup_Kodu { get; set; }
    public string? Grup_Kodu_Aciklama { get; set; }
    
    // Unique identifier from Oracle
    public string Sicil_No { get; set; } = default!;
    
    public string? Adi { get; set; }
    public string? Soyadi { get; set; }
    public string? Email { get; set; }
    
    public string? Pozisyon_Kodu { get; set; }
    public string? Pozisyon_Aciklamasi { get; set; }
    public string? Ust_Pozisyon_Kodu { get; set; }
    
    public string? Departman_Kodu { get; set; }
    public string? Departman_Adi { get; set; }
    
    // Formfleks Specific Extensions
    public Guid? LinkedUserId { get; set; }
    public bool IsActive { get; set; } = true;
    public DateTime? LastSyncDate { get; set; }
}
