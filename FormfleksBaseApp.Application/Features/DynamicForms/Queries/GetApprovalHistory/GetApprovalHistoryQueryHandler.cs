using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetApprovalHistory;

public sealed class GetApprovalHistoryQueryHandler 
    : IRequestHandler<GetApprovalHistoryQuery, IReadOnlyList<HistoryApprovalListItemDto>>
{
    private readonly IDynamicFormsDbContext _db;

    public GetApprovalHistoryQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<HistoryApprovalListItemDto>> Handle(GetApprovalHistoryQuery query, CancellationToken ct)
    {
        var history = await (from app in _db.FormRequestApprovals.AsNoTracking()
                             join r in _db.FormRequests.AsNoTracking() on app.RequestId equals r.Id
                             join t in _db.FormTypes.AsNoTracking() on r.FormTypeId equals t.Id
                             join p in _db.QdmsPersoneller.AsNoTracking() on r.RequestorUserId equals p.LinkedUserId into personeller
                             from person in personeller.DefaultIfEmpty()
                             where app.ActionByUserId == query.UserId && 
                                   (app.Status == (short)ApprovalStatus.Approved || app.Status == (short)ApprovalStatus.Rejected)
                             orderby app.ActionAt descending
                             select new HistoryApprovalListItemDto
                             {
                                 ApprovalId = app.Id,
                                 RequestId = r.Id,
                                 RequestNo = r.RequestNo,
                                 FormTypeName = t.Name,
                                 StepNo = app.StepNo,
                                 RequestorUserId = r.RequestorUserId,
                                 RequestorName = person != null ? person.Adi + " " + person.Soyadi : "Bilinmiyor",
                                 Status = (ApprovalStatus)app.Status,
                                 ProcessedAt = app.ActionAt ?? r.CreatedAt
                             }).ToListAsync(ct);

        return history;
    }
}
