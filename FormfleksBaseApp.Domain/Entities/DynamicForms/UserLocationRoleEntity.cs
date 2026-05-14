using System;

namespace FormfleksBaseApp.Domain.Entities.DynamicForms;

/// <summary>
/// Sistem genelinde lokasyon bazlı dinamik rol atamalarını tutan çok-a-çok (Many-to-Many) ilişki varlığı.
/// Örn: "Mücahit", "Satın Alma" rolünde "Bursa" lokasyonu için yetkilidir.
/// </summary>
public sealed class UserLocationRoleEntity
{
    public Guid Id { get; set; }
    
    /// <summary>
    /// Yetkisi verilen kullanıcının benzersiz kimliği (AppUser)
    /// </summary>
    public Guid UserId { get; set; }
    
    /// <summary>
    /// Sahip olunan rolün kimliği (AppRole veya özel rol)
    /// </summary>
    public Guid RoleId { get; set; }
    
    /// <summary>
    /// QDMS'ten veya İK sisteminden gelen şube / lokasyon tanımı.
    /// Eğer IsGlobalManager true ise bu alan boş bırakılabilir.
    /// </summary>
    public string? LocationName { get; set; }
    
    /// <summary>
    /// Eğer true ise, bu kullanıcı ilgili rolde TÜM LOKASYONLAR için yetkilidir. (Örn: Global Satın Alma Müdürü)
    /// </summary>
    public bool IsGlobalManager { get; set; }
    
    /// <summary>
    /// Bu yetkinin aktif olup olmadığı
    /// </summary>
    public bool IsActive { get; set; }
}
