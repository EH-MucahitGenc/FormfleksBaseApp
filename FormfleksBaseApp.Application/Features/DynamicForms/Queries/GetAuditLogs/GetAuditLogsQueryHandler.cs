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

    public async Task<List<AuditLogItemDto>> Handle(GetAuditLogsQuery request, CancellationToken ct)
    {
        var rawLogs = await _db.AuditLogs
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .Take(500) // limit for UI performance
            .ToListAsync(ct);

        // 1. Resolve distinct Users
        var actorIds = rawLogs.Where(x => x.ActorUserId.HasValue).Select(x => x.ActorUserId!.Value).Distinct().ToList();
        var actorsDict = await _db.QdmsPersoneller
            .AsNoTracking()
            .Where(u => u.LinkedUserId.HasValue && actorIds.Contains(u.LinkedUserId.Value))
            .ToDictionaryAsync(u => u.LinkedUserId!.Value, u => u.Adi + " " + u.Soyadi, ct);

        // 2. Resolve FormRequests
        var requestIds = rawLogs.Where(x => x.EntityType == "FormRequest").Select(x => x.EntityId).Distinct().ToList();
        var requestDict = await _db.FormRequests
            .AsNoTracking()
            .Where(r => requestIds.Contains(r.Id))
            .ToDictionaryAsync(r => r.Id, r => r.RequestNo, ct);

        // 3. Resolve FormRequestApprovals -> FormRequests
        var approvalIds = rawLogs.Where(x => x.EntityType == "FormRequestApproval").Select(x => x.EntityId).Distinct().ToList();
        var approvalDict = await (from a in _db.FormRequestApprovals.AsNoTracking()
                                  join r in _db.FormRequests.AsNoTracking() on a.RequestId equals r.Id
                                  where approvalIds.Contains(a.Id)
                                  select new { a.Id, r.RequestNo })
                                  .ToDictionaryAsync(x => x.Id, x => x.RequestNo, ct);

        var dtos = new List<AuditLogItemDto>(rawLogs.Count);
        foreach (var x in rawLogs)
        {
            var dto = new AuditLogItemDto
            {
                Id = x.Id,
                EntityType = x.EntityType,
                EntityId = x.EntityId,
                ActionType = x.ActionType,
                ActorUserId = x.ActorUserId,
                DetailJson = x.DetailJson,
                CreatedAt = x.CreatedAt
            };

            if (x.ActorUserId.HasValue && actorsDict.TryGetValue(x.ActorUserId.Value, out var aName))
            {
                dto.ActorName = aName;
            }
            
            if (x.EntityType == "FormRequest" && requestDict.TryGetValue(x.EntityId, out var rCode))
            {
                dto.TargetName = rCode;
            }
            else if (x.EntityType == "FormRequestApproval" && approvalDict.TryGetValue(x.EntityId, out var aCode))
            {
                dto.TargetName = aCode;
            }
            else
            {
                dto.TargetName = x.EntityId.ToString();
            }

            dtos.Add(dto);
        }

        return dtos;
    }
}
