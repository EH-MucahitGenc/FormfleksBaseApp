using System;

namespace FormfleksBaseApp.DynamicForms.Business.Contracts.Reports;

public sealed class HrFormDetailItemDto
{
    public Guid FormRequestId { get; set; }
    public string FormRequestNo { get; set; } = string.Empty;
    public string FormTypeName { get; set; } = string.Empty;
    public string RequestorName { get; set; } = string.Empty;
    public DateTime CreatedAt { get; set; }
    public int Status { get; set; } // 1: Draft, 2: InProgress, 3: Completed, 4: Rejected, 5: Cancelled
    public DateTime? CompletedAt { get; set; }
}
