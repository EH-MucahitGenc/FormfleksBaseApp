using FormfleksBaseApp.Application.DynamicForms.Business.Services;
using FormfleksBaseApp.Contracts.DynamicForms.AuditLogs;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.DataAccess;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Services;

public class AuditLogService : IAuditLogService
{
    private readonly DynamicFormsDbContext _db;

    public AuditLogService(DynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task LogActionAsync(AuditLogActionRequestDto request, CancellationToken ct)
    {
        var log = new AuditLogEntity
        {
            EntityType = request.EntityType,
            EntityId = request.EntityId,
            ActionType = request.ActionType,
            ActorUserId = request.ActorUserId,
            DetailJson = request.DetailJson,
            CreatedAt = DateTime.UtcNow
        };

        _db.AuditLogs.Add(log);
        await _db.SaveChangesAsync(ct);
    }

    public Task<List<AuditLogItemDto>> GetLogsAsync(CancellationToken ct)
    {
        return _db.AuditLogs
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(500) // limit for UI performance
            .Select(x => new AuditLogItemDto
            {
                Id = x.Id,
                EntityType = x.EntityType,
                EntityId = x.EntityId,
                ActionType = x.ActionType,
                ActorUserId = x.ActorUserId,
                DetailJson = x.DetailJson,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(ct);
    }

    public Task<List<AuditLogItemDto>> GetLogsByEntityIdAsync(Guid entityId, CancellationToken ct)
    {
        return _db.AuditLogs
            .AsNoTracking()
            .Where(x => x.EntityId == entityId)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new AuditLogItemDto
            {
                Id = x.Id,
                EntityType = x.EntityType,
                EntityId = x.EntityId,
                ActionType = x.ActionType,
                ActorUserId = x.ActorUserId,
                DetailJson = x.DetailJson,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(ct);
    }
}
