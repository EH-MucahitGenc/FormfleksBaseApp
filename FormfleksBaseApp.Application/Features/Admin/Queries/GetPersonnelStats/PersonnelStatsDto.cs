using System;
using System.Collections.Generic;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetPersonnelStats;

public class PersonnelStatsDto
{
    public int TotalActivePersonnel { get; set; }
    public int TotalDepartments { get; set; }
    public int TotalPositions { get; set; }
    public DateTime? LastSyncDate { get; set; }
    
    // Some chart data
    public List<DepartmentDistributionDto> DepartmentDistribution { get; set; } = new();
}

public class DepartmentDistributionDto
{
    public string DepartmentName { get; set; } = string.Empty;
    public int Count { get; set; }
}
