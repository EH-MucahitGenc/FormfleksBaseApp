using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.AdminUsers.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetSyncLogs;

public sealed class GetSyncLogsQueryHandler : IRequestHandler<GetSyncLogsQuery, PagedResult<SyncLogDto>>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IAdminUserRepository _userRepo;

    public GetSyncLogsQueryHandler(IDynamicFormsDbContext db, IAdminUserRepository userRepo)
    {
        _db = db;
        _userRepo = userRepo;
    }

    public async Task<PagedResult<SyncLogDto>> Handle(GetSyncLogsQuery request, CancellationToken ct)
    {
        var localUsers = await _userRepo.GetAllUsersWithRolesAsync(ct);
        var userDict = localUsers.ToDictionary(u => u.Id, u => u.DisplayName ?? u.Email);

        var query = _db.QdmsPersonelSyncLogs.AsNoTracking().OrderByDescending(l => l.StartTime);
        
        var total = await query.CountAsync(ct);
        
        var items = await query
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(ct);

        var dtos = items.Select(l => new SyncLogDto
        {
            Id = l.Id,
            StartTime = l.StartTime,
            EndTime = l.EndTime,
            InsertedCount = l.InsertedCount,
            UpdatedCount = l.UpdatedCount,
            DeactivatedCount = l.DeactivatedCount,
            ErrorMessage = l.ErrorsJson,
            TriggeredByUser = l.TriggeredByUserId == Guid.Empty ? "System (Cron)" : 
                              (userDict.TryGetValue(l.TriggeredByUserId, out var n) ? n : "Unknown Admin")
        }).ToList();

        return new PagedResult<SyncLogDto>(dtos, request.Page, request.PageSize, total);
    }
}
