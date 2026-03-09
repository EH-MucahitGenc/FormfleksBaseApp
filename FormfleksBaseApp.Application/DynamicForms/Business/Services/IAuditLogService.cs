using FormfleksBaseApp.Contracts.DynamicForms.AuditLogs;

namespace FormfleksBaseApp.Application.DynamicForms.Business.Services;

public interface IAuditLogService
{
    Task LogActionAsync(AuditLogActionRequestDto request, CancellationToken ct);
    Task<List<AuditLogItemDto>> GetLogsAsync(CancellationToken ct);
    Task<List<AuditLogItemDto>> GetLogsByEntityIdAsync(Guid entityId, CancellationToken ct);
}
