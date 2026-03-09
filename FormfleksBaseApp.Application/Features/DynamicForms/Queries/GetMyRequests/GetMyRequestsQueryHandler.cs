using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetMyRequests;

public sealed class GetMyRequestsQueryHandler : IRequestHandler<GetMyRequestsQuery, IReadOnlyList<MyFormRequestListItemDto>>
{
    private readonly IDynamicFormsDbContext _db;

    public GetMyRequestsQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<MyFormRequestListItemDto>> Handle(GetMyRequestsQuery request, CancellationToken ct)
    {
        var query = from r in _db.FormRequests.AsNoTracking()
                    join t in _db.FormTypes.AsNoTracking() on r.FormTypeId equals t.Id
                    where r.RequestorUserId == request.RequestorUserId
                    orderby r.CreatedAt descending
                    select new MyFormRequestListItemDto
                    {
                        RequestId = r.Id,
                        RequestNo = r.RequestNo,
                        FormTypeCode = t.Code,
                        FormTypeName = t.Name,
                        Status = (FormRequestStatus)r.Status,
                        CurrentStepNo = r.CurrentStepNo,
                        CreatedAt = r.CreatedAt
                    };

        return await query.ToListAsync(ct);
    }
}
