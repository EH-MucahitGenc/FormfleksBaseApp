using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Contracts.DynamicForms.AuditLogs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetAuditLogs;

public sealed class GetAuditLogsQueryHandler : IRequestHandler<GetAuditLogsQuery, List<AuditLogItemDto>>
{
    private readonly IDynamicFormsDbContext _db;

    public GetAuditLogsQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public Task<List<AuditLogItemDto>> Handle(GetAuditLogsQuery request, CancellationToken ct)
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
}
