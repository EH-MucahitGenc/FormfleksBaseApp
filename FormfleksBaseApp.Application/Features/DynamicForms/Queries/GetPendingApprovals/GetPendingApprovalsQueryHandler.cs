using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetPendingApprovals;

public sealed class GetPendingApprovalsQueryHandler : IRequestHandler<GetPendingApprovalsQuery, IReadOnlyList<PendingApprovalListItemDto>>
{
    private readonly IDynamicFormsDbContext _db;

    public GetPendingApprovalsQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<PendingApprovalListItemDto>> Handle(GetPendingApprovalsQuery request, CancellationToken ct)
    {
        var userRoleIds = await _db.UserRoles
            .AsNoTracking()
            .Where(ur => ur.UserId == request.ActorUserId)
            .Select(ur => ur.RoleId)
            .ToListAsync(ct);

        if (userRoleIds.Count == 0)
            return new List<PendingApprovalListItemDto>();

        return await (from app in _db.FormRequestApprovals.AsNoTracking()
                      join r in _db.FormRequests.AsNoTracking() on app.RequestId equals r.Id
                      join t in _db.FormTypes.AsNoTracking() on r.FormTypeId equals t.Id
                      where app.Status == (short)ApprovalStatus.Pending
                      && (app.AssigneeUserId == request.ActorUserId || (app.AssigneeRoleId.HasValue && userRoleIds.Contains(app.AssigneeRoleId.Value)))
                      orderby app.StepNo ascending, r.CreatedAt ascending
                      select new PendingApprovalListItemDto
                      {
                          ApprovalId = app.Id,
                          RequestId = r.Id,
                          RequestNo = r.RequestNo,
                          StepNo = app.StepNo,
                          AssigneeUserId = app.AssigneeUserId,
                          AssigneeRoleId = app.AssigneeRoleId,
                          RequestorUserId = r.RequestorUserId,
                          FormTypeName = t.Name,
                          ApprovalConcurrencyToken = app.ConcurrencyToken,
                          CreatedAt = r.CreatedAt
                      }).ToListAsync(ct);
    }
}
