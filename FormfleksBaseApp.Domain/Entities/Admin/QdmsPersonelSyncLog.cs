using FormfleksBaseApp.Domain.Entities;

using System.ComponentModel.DataAnnotations.Schema;

namespace FormfleksBaseApp.Domain.Entities.Admin;

/// <summary>
/// Harici sistemlerden (örneğin QDMS) içeriye yapılan personel senkronizasyonu işlemlerinin 
/// loglarını (ne zaman başladı, kaç kayıt eklendi/güncellendi vb.) tutan varlık.
/// </summary>
[Table("qdms_personel_sync_logs", Schema = "public")]
public class QdmsPersonelSyncLog : BaseEntity
{
    public Guid TriggeredByUserId { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int InsertedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int DeactivatedCount { get; set; }
    public string? ErrorsJson { get; set; }
}
