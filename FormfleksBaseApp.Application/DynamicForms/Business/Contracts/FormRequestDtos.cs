using FormfleksBaseApp.DynamicForms.Domain.Enums;

namespace FormfleksBaseApp.DynamicForms.Business.Contracts;

public sealed class UpsertFormRequestItemDto
{
    public string FieldKey { get; set; } = default!;
    public string? ValueText { get; set; }
    public decimal? ValueNumber { get; set; }
    public DateTime? ValueDateTime { get; set; }
    public bool? ValueBool { get; set; }
    public string? ValueJson { get; set; }
}

public sealed class SaveDraftRequestDto
{
    public Guid? RequestId { get; set; }
    public Guid FormTypeId { get; set; }
    public Guid RequestorUserId { get; set; }
    public long? ConcurrencyToken { get; set; }
    public IReadOnlyList<UpsertFormRequestItemDto> Values { get; set; } = [];
}

public sealed class SubmitRequestDto
{
    public Guid RequestId { get; set; }
    public Guid ActorUserId { get; set; }
    public long ConcurrencyToken { get; set; }
}

public sealed class ApprovalActionRequestDto
{
    public Guid RequestId { get; set; }
    public Guid ApprovalId { get; set; }
    public Guid ActorUserId { get; set; }
    public long ApprovalConcurrencyToken { get; set; }
    public ApprovalActionType ActionType { get; set; }
    public string? Comment { get; set; }
}

public sealed class FormRequestResultDto
{
    public Guid RequestId { get; set; }
    public FormRequestStatus Status { get; set; }
    public int? CurrentStepNo { get; set; }
    public long ConcurrencyToken { get; set; }
}

public sealed class MyFormRequestListItemDto
{
    public Guid RequestId { get; set; }
    public string RequestNo { get; set; } = default!;
    public string FormTypeCode { get; set; } = default!;
    public string FormTypeName { get; set; } = default!;
    public FormRequestStatus Status { get; set; }
    public int? CurrentStepNo { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class PendingApprovalListItemDto
{
    public Guid ApprovalId { get; set; }
    public Guid RequestId { get; set; }
    public string RequestNo { get; set; } = default!;
    public int StepNo { get; set; }
    public Guid? AssigneeUserId { get; set; }
    public Guid? AssigneeRoleId { get; set; }
    public Guid RequestorUserId { get; set; }
    public string RequestorName { get; set; } = default!;
    public string FormTypeName { get; set; } = default!;
    public long ApprovalConcurrencyToken { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class FormRequestValueDto
{
    public string FieldKey { get; set; } = default!;
    public string Label { get; set; } = default!;
    public int FieldType { get; set; }
    public string? OptionsJson { get; set; }
    public string? ValueText { get; set; }
}

public sealed class FormRequestDetailedDto
{
    public Guid RequestId { get; set; }
    public string RequestNo { get; set; } = default!;
    public string FormTypeCode { get; set; } = default!;
    public string FormTypeName { get; set; } = default!;
    public string RequesterCompany { get; set; } = string.Empty;
    public FormRequestStatus Status { get; set; }
    public long ConcurrencyToken { get; set; }
    public IReadOnlyList<FormRequestValueDto> Values { get; set; } = [];
    public IReadOnlyList<FormRequestWorkflowStepDto> Workflow { get; set; } = [];
}

public sealed class FormRequestWorkflowStepDto
{
    public string Step { get; set; } = default!;
    public string Status { get; set; } = default!;
    public string Actor { get; set; } = default!;
    public DateTime? Date { get; set; }
    public string? Comment { get; set; }
}

public sealed record MyFormRequestDto
{
    public Guid RequestId { get; init; }
    public string FormName { get; init; } = string.Empty;
    public int Status { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed record PendingApprovalDto
{
    public Guid RequestId { get; init; }
    public string FormName { get; init; } = string.Empty;
    public Guid RequestorUserId { get; init; }
    public DateTime CreatedAt { get; init; }
}

public sealed record ApprovalActionResponseDto
{
    public bool Success { get; init; }
}

public sealed class HistoryApprovalListItemDto
{
    public Guid ApprovalId { get; set; }
    public Guid RequestId { get; set; }
    public string RequestNo { get; set; } = default!;
    public string FormTypeName { get; set; } = default!;
    public int StepNo { get; set; }
    public Guid RequestorUserId { get; set; }
    public string RequestorName { get; set; } = default!;
    public ApprovalStatus Status { get; set; }
    public DateTime ProcessedAt { get; set; }
}
