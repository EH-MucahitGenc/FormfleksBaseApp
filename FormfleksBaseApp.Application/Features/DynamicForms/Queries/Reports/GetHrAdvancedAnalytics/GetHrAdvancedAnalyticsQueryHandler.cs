using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Business.Contracts.Reports;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetHrAdvancedAnalytics;

public sealed class GetHrAdvancedAnalyticsQueryHandler : IRequestHandler<GetHrAdvancedAnalyticsQuery, HrAdvancedAnalyticsDto>
{
    private readonly IDynamicFormsDbContext _db;

    public GetHrAdvancedAnalyticsQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<HrAdvancedAnalyticsDto> Handle(GetHrAdvancedAnalyticsQuery request, CancellationToken ct)
    {
        var result = new HrAdvancedAnalyticsDto();

        var query = _db.FormRequests.AsNoTracking();

        if (request.StartDate.HasValue)
            query = query.Where(r => r.CreatedAt >= request.StartDate.Value);
        
        if (request.EndDate.HasValue)
            query = query.Where(r => r.CreatedAt <= request.EndDate.Value);

        if (request.RequestorUserId.HasValue)
            query = query.Where(r => r.RequestorUserId == request.RequestorUserId.Value);

        // Fetch all relevant form requests to memory since complex aggregations might fail on EF
        var formRequests = await query
            .Select(r => new { r.Status, r.CreatedAt, r.SubmittedAt, r.CompletedAt, r.FormTypeId })
            .ToListAsync(ct);

        // Join to FormTypes locally if needed or fetch them
        var formTypes = await _db.FormTypes.AsNoTracking().ToDictionaryAsync(f => f.Id, f => f.Name, ct);

        // 1. Status Distributions
        var statusCounts = formRequests.GroupBy(r => r.Status)
            .Select(g => new StatusDistributionDto
            {
                StatusName = GetStatusName(g.Key),
                Count = g.Count()
            }).ToList();
        
        result.StatusDistributions = statusCounts;

        // 2. Trend Metrics (Group by Date)
        var trendCounts = formRequests
            .GroupBy(r => r.CreatedAt.Date)
            .OrderBy(g => g.Key)
            .Select(g => new TrendMetricDto
            {
                DateLabel = g.Key.ToString("dd.MM.yyyy"),
                RequestCount = g.Count()
            }).ToList();
        
        result.TrendMetrics = trendCounts;

        // 3. SLA Metrics (Time from Submitted to Completed)
        var completedForms = formRequests.Where(r => r.Status == 3 || r.Status == 4).ToList(); // Completed or Rejected
        var slaGroups = completedForms
            .Where(r => r.SubmittedAt.HasValue && r.CompletedAt.HasValue)
            .GroupBy(r => r.FormTypeId)
            .Select(g => new SlaMetricDto
            {
                FormTypeName = formTypes.TryGetValue(g.Key, out var name) ? name : "Bilinmeyen Form",
                TotalCompletedForms = g.Count(),
                AverageCompletionDays = Math.Round(g.Average(r => (r.CompletedAt!.Value - r.SubmittedAt!.Value).TotalDays), 2)
            }).ToList();

        result.SlaMetrics = slaGroups;

        return result;
    }

    private string GetStatusName(short status)
    {
        return status switch
        {
            1 => "Taslak",
            2 => "Onay Bekliyor",
            3 => "Onaylandı",
            4 => "Reddedildi",
            5 => "İptal",
            _ => "Bilinmiyor"
        };
    }
}
