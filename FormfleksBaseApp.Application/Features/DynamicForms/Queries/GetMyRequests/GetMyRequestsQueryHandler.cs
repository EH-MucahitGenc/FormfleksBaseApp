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
        var isCurrentUserGlobalIk = await _db.UserLocationRoles
            .AnyAsync(lr => lr.UserId == request.RequestorUserId && lr.IsActive && lr.IsGlobalManager, ct);

        List<Guid> globalIkUserIds = new();
        if (isCurrentUserGlobalIk)
        {
             globalIkUserIds = await _db.UserLocationRoles
                .Where(lr => lr.IsActive && lr.IsGlobalManager)
                .Select(lr => lr.UserId)
                .ToListAsync(ct);
        }

        var query = from r in _db.FormRequests.AsNoTracking()
                    join t in _db.FormTypes.AsNoTracking() on r.FormTypeId equals t.Id
                    where r.RequestorUserId == request.RequestorUserId ||
                          (isCurrentUserGlobalIk && globalIkUserIds.Contains(r.RequestorUserId) && r.Status == (short)FormRequestStatus.Draft)
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

        var result = await query.ToListAsync(ct);

        if (result.Any())
        {
            var requestIds = result.Select(r => r.RequestId).ToList();
            var formValues = await (from v in _db.FormRequestValues.AsNoTracking()
                                    join f in _db.FormFields.AsNoTracking() on v.FieldId equals f.Id
                                    where requestIds.Contains(v.RequestId)
                                    select new { v.RequestId, v.ValueText, f.FieldKey, f.Label }).ToListAsync(ct);

            var groupedValues = formValues.GroupBy(x => x.RequestId).ToDictionary(g => g.Key, g => g.ToList());

            foreach (var item in result)
            {
                if (groupedValues.TryGetValue(item.RequestId, out var values))
                {
                    var subjectField = values.FirstOrDefault(v => 
                        (v.FieldKey == "adi_soyadi" || v.FieldKey == "ad_soyad" || v.FieldKey == "personel_adi" || v.FieldKey == "calisan_adi" || v.FieldKey == "personel")
                        || (v.Label != null && (
                            v.Label.Contains("Adı", StringComparison.OrdinalIgnoreCase) && v.Label.Contains("Soyadı", StringComparison.OrdinalIgnoreCase) ||
                            v.Label.Contains("İlgili Kişi", StringComparison.OrdinalIgnoreCase) ||
                            v.Label.Contains("Personel Ad", StringComparison.OrdinalIgnoreCase) ||
                            v.Label.Contains("Çalışan Ad", StringComparison.OrdinalIgnoreCase)
                        ))
                    );
                    item.SubjectPersonName = subjectField?.ValueText;
                }
            }
        }

        return result;
    }
}
