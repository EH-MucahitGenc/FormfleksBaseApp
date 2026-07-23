using FormfleksBaseApp.Domain.Entities;

using System.ComponentModel.DataAnnotations.Schema;

namespace FormfleksBaseApp.Domain.Entities.Admin;

/// <summary>
/// QDMS (Kalite Yönetim Sistemi) üzerinden veya diğer harici İK sistemlerinden 
/// aktarılan personel bilgilerini geçici veya kalıcı olarak tutan varlık.
/// Bu tablo, yerel AppUser tablosu ile senkronizasyon süreçlerinde kullanılır.
/// </summary>
[Table("qdms_personeller", Schema = "public")]
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
    
    // New QDMS Fields for Probation Tracking
    public DateTime? Baslama_Tarihi { get; set; }
    public DateTime? Deneme2Ay_Trh { get; set; }
    public DateTime? Deneme6Ay_Trh { get; set; }
    public DateTime? Dogum_Tarihi { get; set; }
}
