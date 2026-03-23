using System;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetSyncLogs;

public class SyncLogDto
{
    public Guid Id { get; set; }
    public DateTime StartTime { get; set; }
    public DateTime? EndTime { get; set; }
    public int InsertedCount { get; set; }
    public int UpdatedCount { get; set; }
    public int DeactivatedCount { get; set; }
    public string? ErrorMessage { get; set; }
    public bool IsSuccess => string.IsNullOrWhiteSpace(ErrorMessage);
    public string TriggeredByUser { get; set; } = string.Empty;
}
