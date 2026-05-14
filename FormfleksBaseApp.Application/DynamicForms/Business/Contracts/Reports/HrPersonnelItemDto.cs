using System;

namespace FormfleksBaseApp.DynamicForms.Business.Contracts.Reports;

public sealed class HrPersonnelItemDto
{
    public Guid UserId { get; set; }
    public string FullName { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
}
