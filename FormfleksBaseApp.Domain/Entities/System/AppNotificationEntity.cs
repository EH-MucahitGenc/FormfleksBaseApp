using System;

namespace FormfleksBaseApp.Domain.Entities.System;

/// <summary>
/// Sistem içi (In-App) gerçek zamanlı ve kalıcı bildirimlerin tutulduğu varlık.
/// </summary>
public sealed class AppNotificationEntity
{
    public Guid Id { get; set; }
    
    /// <summary>
    /// Bildirimin gideceği kullanıcının Id'si.
    /// </summary>
    public Guid UserId { get; set; }
    
    /// <summary>
    /// Bildirim başlığı. Örn: "Yeni Onay Bekliyor"
    /// </summary>
    public string Title { get; set; } = default!;
    
    /// <summary>
    /// Bildirim içeriği. Örn: "İzin formu için onayınız bekleniyor."
    /// </summary>
    public string Message { get; set; } = default!;
    
    /// <summary>
    /// İlgili form veya işlemin Id'si (Kullanıcı bildirime tıklayınca nereye gideceğini belirlemek için).
    /// </summary>
    public Guid? ReferenceId { get; set; }
    
    /// <summary>
    /// Bildirimin yönlendirileceği sayfa/rota. Örn: "/forms/detail/{id}"
    /// </summary>
    public string? ActionUrl { get; set; }
    
    /// <summary>
    /// Bildirimin okunma durumu.
    /// </summary>
    public bool IsRead { get; set; }
    
    /// <summary>
    /// Bildirimin oluşturulma tarihi.
    /// </summary>
    public DateTime CreatedAt { get; set; }

    public AppNotificationEntity()
    {
        IsRead = false;
        CreatedAt = DateTime.UtcNow;
    }
}
