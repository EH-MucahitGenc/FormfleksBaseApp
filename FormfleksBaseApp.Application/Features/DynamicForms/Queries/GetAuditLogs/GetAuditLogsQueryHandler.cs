using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Contracts.DynamicForms.AuditLogs;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetAuditLogs;

public sealed class GetAuditLogsQueryHandler : IRequestHandler<GetAuditLogsQuery, List<AuditLogItemDto>>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IUserRepository _userRepository;

    public GetAuditLogsQueryHandler(IDynamicFormsDbContext db, IUserRepository userRepository)
    {
        _db = db;
        _userRepository = userRepository;
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
        var requestIds = rawLogs.Where(x => x.EntityType == "FormRequest" || x.EntityType == "FormRequestApproval").Select(x => x.EntityId).Distinct().ToList();
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

            if (x.ActorUserId.HasValue)
            {
                if (actorsDict.TryGetValue(x.ActorUserId.Value, out var aName))
                {
                    dto.ActorName = aName;
                }
                else
                {
                    // Fallback to AppUser if not in QdmsPersoneller
                    var fallbackUser = await _userRepository.GetByIdAsync(x.ActorUserId.Value, ct, false);
                    if (fallbackUser != null && !string.IsNullOrWhiteSpace(fallbackUser.DisplayName))
                    {
                        dto.ActorName = fallbackUser.DisplayName;
                        actorsDict[x.ActorUserId.Value] = fallbackUser.DisplayName; // Cache for next loop iterations
                    }
                }
            }
            
            if (x.EntityType == "FormRequest" && requestDict.TryGetValue(x.EntityId, out var rCode))
            {
                dto.TargetName = rCode;
            }
            else if (x.EntityType == "FormRequestApproval")
            {
                if (approvalDict.TryGetValue(x.EntityId, out var aCode))
                {
                    dto.TargetName = aCode;
                }
                else if (requestDict.TryGetValue(x.EntityId, out var rCode2))
                {
                    dto.TargetName = rCode2;
                }
                else 
                {
                    dto.TargetName = x.EntityId.ToString();
                }
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
