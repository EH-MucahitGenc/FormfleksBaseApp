using System;
using System.Collections.Generic;

namespace FormfleksBaseApp.DynamicForms.Business.Contracts.Reports;

public sealed class HrAdvancedAnalyticsDto
{
    public List<SlaMetricDto> SlaMetrics { get; set; } = new();
    public List<StatusDistributionDto> StatusDistributions { get; set; } = new();
    public List<TrendMetricDto> TrendMetrics { get; set; } = new();
}

public sealed class SlaMetricDto
{
    public string FormTypeName { get; set; } = string.Empty;
    public double AverageCompletionDays { get; set; }
    public int TotalCompletedForms { get; set; }
}

public sealed class StatusDistributionDto
{
    public string StatusName { get; set; } = string.Empty; // e.g. Draft, InProgress, Completed, Rejected
    public int Count { get; set; }
}

public sealed class TrendMetricDto
{
    public string DateLabel { get; set; } = string.Empty; // e.g. "2026-05-14"
    public int RequestCount { get; set; }
}
