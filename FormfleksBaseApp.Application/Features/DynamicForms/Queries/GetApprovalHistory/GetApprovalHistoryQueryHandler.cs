using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetApprovalHistory;

/// <summary>
/// Kullanıcının daha önce onayladığı veya reddettiği tüm form işlemlerinin geçmişini (Approval History) getiren Query Handler sınıfıdır.
/// QDMS Personel kartında bulunamayan kullanıcılar için AppUser tablosundaki isimleri otomatik yedek (fallback) olarak çeker.
/// </summary>
public sealed class GetApprovalHistoryQueryHandler 
    : IRequestHandler<GetApprovalHistoryQuery, IReadOnlyList<HistoryApprovalListItemDto>>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IUserRepository _userRepository;

    public GetApprovalHistoryQueryHandler(IDynamicFormsDbContext db, IUserRepository userRepository)
    {
        _db = db;
        _userRepository = userRepository;
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

        // Fallback for "Bilinmiyor"
        var missingNameUserIds = history.Where(x => x.RequestorName == "Bilinmiyor").Select(x => x.RequestorUserId).Distinct().ToList();
        if (missingNameUserIds.Any())
        {
            foreach (var reqUserId in missingNameUserIds)
            {
                var appUser = await _userRepository.GetByIdAsync(reqUserId, ct, track: false);
                if (appUser != null)
                {
                    var fallbackName = !string.IsNullOrWhiteSpace(appUser.DisplayName) ? appUser.DisplayName : appUser.Email;
                    foreach (var item in history.Where(x => x.RequestorUserId == reqUserId))
                    {
                        item.RequestorName = fallbackName;
                    }
                }
            }
        }

        return history;
    }
}
