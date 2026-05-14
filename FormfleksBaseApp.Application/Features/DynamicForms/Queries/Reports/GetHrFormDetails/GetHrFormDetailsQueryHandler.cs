using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Business.Contracts.Reports;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetHrFormDetails;

public sealed class GetHrFormDetailsQueryHandler : IRequestHandler<GetHrFormDetailsQuery, List<HrFormDetailItemDto>>
{
    private readonly IDynamicFormsDbContext _db;

    public GetHrFormDetailsQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<List<HrFormDetailItemDto>> Handle(GetHrFormDetailsQuery request, CancellationToken ct)
    {
        var query = _db.FormRequests
            .AsNoTracking()
            .Where(r => r.RequestorUserId == request.RequestorUserId && r.FormTypeId == request.FormTypeId);

        if (request.StartDate.HasValue)
        {
            query = query.Where(r => r.CreatedAt >= request.StartDate.Value);
        }

        if (request.EndDate.HasValue)
        {
            query = query.Where(r => r.CreatedAt <= request.EndDate.Value);
        }

        var results = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new HrFormDetailItemDto
            {
                FormRequestId = r.Id,
                FormRequestNo = r.RequestNo,
                FormTypeName = "", // Will fill below
                RequestorName = "", // Will fill below
                CreatedAt = r.CreatedAt,
                Status = (int)r.Status,
                CompletedAt = r.CompletedAt
            })
            .ToListAsync(ct);

        if (!results.Any()) return results;

        // Fetch User Info
        var userInfo = await _db.QdmsPersoneller
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.LinkedUserId == request.RequestorUserId, ct);

        var fullName = userInfo != null ? $"{userInfo.Adi} {userInfo.Soyadi}" : "Bilinmeyen Kullanıcı";

        var formType = await _db.FormTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(f => f.Id == request.FormTypeId, ct);
            
        var formTypeName = formType != null ? formType.Name : "Bilinmeyen Form";

        foreach (var item in results)
        {
            item.RequestorName = fullName;
            item.FormTypeName = formTypeName;
        }

        return results;
    }
}
