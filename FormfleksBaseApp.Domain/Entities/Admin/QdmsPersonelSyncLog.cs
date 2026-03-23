using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Domain.Entities.Admin;

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
