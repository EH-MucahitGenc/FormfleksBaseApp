using System;

namespace FormfleksBaseApp.DynamicForms.Business.Contracts.Reports;

public sealed class HrSummaryReportDto
{
    public Guid RequestorUserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public Guid FormTypeId { get; set; }
    public string FormTypeName { get; set; } = string.Empty;
    public int TotalForms { get; set; }
    public int TotalApproved { get; set; }
    public int TotalRejected { get; set; }
    public int TotalDraft { get; set; }
}
