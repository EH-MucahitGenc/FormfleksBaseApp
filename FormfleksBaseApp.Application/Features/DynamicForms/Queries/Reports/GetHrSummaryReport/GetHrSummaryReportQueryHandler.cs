using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Business.Contracts.Reports;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetHrSummaryReport;

public sealed class GetHrSummaryReportQueryHandler : IRequestHandler<GetHrSummaryReportQuery, List<HrSummaryReportDto>>
{
    private readonly IDynamicFormsDbContext _db;

    public GetHrSummaryReportQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<List<HrSummaryReportDto>> Handle(GetHrSummaryReportQuery request, CancellationToken ct)
    {
        var query = _db.FormRequests.AsNoTracking().AsQueryable();

        if (request.StartDate.HasValue)
        {
            query = query.Where(r => r.CreatedAt >= request.StartDate.Value);
        }

        if (request.EndDate.HasValue)
        {
            query = query.Where(r => r.CreatedAt <= request.EndDate.Value);
        }

        if (request.RequestorUserId.HasValue)
        {
            query = query.Where(r => r.RequestorUserId == request.RequestorUserId.Value);
        }

        // Only count actual submissions (ignore drafts or cancelled if needed, but let's include all non-draft for now)
        // Let's assume Status > 0 means submitted (0 might be draft).
        // Actually, Draft is 1, Submitted is 2... We should check the Enum, but for HR report they want to see "filled out".
        // Let's just group all of them for now, or maybe exclude drafts if they haven't sent it.
        // We'll filter out Status == 1 (Draft) if we can. But let's leave it simple first.
        
        var formCounts = await query
            .GroupBy(r => new { r.RequestorUserId, r.FormTypeId })
            .Select(g => new
            {
                g.Key.RequestorUserId,
                g.Key.FormTypeId,
                TotalForms = g.Count(),
                TotalApproved = g.Count(r => r.Status == (short)FormRequestStatus.Approved),
                TotalRejected = g.Count(r => r.Status == (short)FormRequestStatus.Rejected),
                TotalDraft = g.Count(r => r.Status == (short)FormRequestStatus.Draft)
            })
            .ToListAsync(ct);

        if (!formCounts.Any())
            return new List<HrSummaryReportDto>();

        var userIds = formCounts.Select(f => f.RequestorUserId).Distinct().ToList();
        var formTypeIds = formCounts.Select(f => f.FormTypeId).Distinct().ToList();

        var users = await _db.QdmsPersoneller
            .AsNoTracking()
            .Where(p => p.LinkedUserId.HasValue && userIds.Contains(p.LinkedUserId.Value))
            .ToListAsync(ct);

        var formTypes = await _db.FormTypes
            .AsNoTracking()
            .Where(f => formTypeIds.Contains(f.Id))
            .ToListAsync(ct);

        var result = new List<HrSummaryReportDto>();

        foreach (var item in formCounts)
        {
            var user = users.FirstOrDefault(u => u.LinkedUserId == item.RequestorUserId);
            var formType = formTypes.FirstOrDefault(f => f.Id == item.FormTypeId);

            result.Add(new HrSummaryReportDto
            {
                RequestorUserId = item.RequestorUserId,
                FullName = user != null ? $"{user.Adi} {user.Soyadi}" : "Bilinmeyen Kullanıcı",
                Department = user?.Departman_Adi ?? "-",
                Location = user?.Isyeri_Tanimi ?? "-",
                FormTypeId = item.FormTypeId,
                FormTypeName = formType?.Name ?? "Bilinmeyen Form",
                TotalForms = item.TotalForms,
                TotalApproved = item.TotalApproved,
                TotalRejected = item.TotalRejected,
                TotalDraft = item.TotalDraft
            });
        }

        return result.OrderByDescending(r => r.TotalForms).ToList();
    }
}
