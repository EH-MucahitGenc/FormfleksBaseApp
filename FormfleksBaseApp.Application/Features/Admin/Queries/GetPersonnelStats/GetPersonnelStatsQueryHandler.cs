using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetPersonnelStats;

public sealed class GetPersonnelStatsQueryHandler : IRequestHandler<GetPersonnelStatsQuery, PersonnelStatsDto>
{
    private readonly IDynamicFormsDbContext _db;

    public GetPersonnelStatsQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<PersonnelStatsDto> Handle(GetPersonnelStatsQuery request, CancellationToken ct)
    {
        var activePersonnels = await _db.QdmsPersoneller
            .AsNoTracking()
            .Where(p => p.IsActive)
            .ToListAsync(ct);

        var totalActive = activePersonnels.Count;
        
        var totalDepts = activePersonnels
            .Where(p => !string.IsNullOrWhiteSpace(p.Departman_Adi))
            .Select(p => p.Departman_Adi)
            .Distinct()
            .Count();

        var totalPositions = activePersonnels
            .Where(p => !string.IsNullOrWhiteSpace(p.Pozisyon_Aciklamasi))
            .Select(p => p.Pozisyon_Aciklamasi)
            .Distinct()
            .Count();

        var lastSync = await _db.QdmsPersonelSyncLogs
            .AsNoTracking()
            .OrderByDescending(l => l.EndTime)
            .Select(l => l.EndTime)
            .FirstOrDefaultAsync(ct);

        // Department distribution for charts (Top 5 + Diğer)
        var deptGroups = activePersonnels
            .Where(p => !string.IsNullOrWhiteSpace(p.Departman_Adi))
            .GroupBy(p => p.Departman_Adi!)
            .OrderByDescending(g => g.Count())
            .ToList();

        var chartData = deptGroups.Take(5).Select(g => new DepartmentDistributionDto
        {
            DepartmentName = g.Key,
            Count = g.Count()
        }).ToList();

        if (deptGroups.Count > 5)
        {
            var othersCount = deptGroups.Skip(5).Sum(g => g.Count());
            chartData.Add(new DepartmentDistributionDto
            {
                DepartmentName = "Diğer",
                Count = othersCount
            });
        }

        return new PersonnelStatsDto
        {
            TotalActivePersonnel = totalActive,
            TotalDepartments = totalDepts,
            TotalPositions = totalPositions,
            LastSyncDate = lastSync == default ? null : lastSync,
            DepartmentDistribution = chartData
        };
    }
}
