namespace FormfleksBaseApp.Web.Models;

public sealed class FormDefinitionDto
{
    public Guid FormTypeId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public IReadOnlyList<FormSectionDto> Sections { get; set; } = [];
}

public sealed class FormSectionDto
{
    public Guid SectionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public int SortOrder { get; set; }
    public IReadOnlyList<FormFieldDto> Fields { get; set; } = [];
}

public sealed class FormFieldDto
{
    public Guid FieldId { get; set; }
    public string Key { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int FieldType { get; set; }
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
    public string? Placeholder { get; set; }
    public string? HelpText { get; set; }
    public string? DefaultValue { get; set; }
    public string? OptionsJson { get; set; }
    public string? ValidationJson { get; set; }
    public string? VisibilityRuleJson { get; set; }
}

public sealed class UpsertFormRequestItemDto
{
    public string FieldKey { get; set; } = string.Empty;
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

public sealed class FormRequestResultDto
{
    public Guid RequestId { get; set; }
    public int Status { get; set; }
    public int? CurrentStepNo { get; set; }
    public long ConcurrencyToken { get; set; }
}

public sealed class MyFormRequestListItemDto
{
    public Guid RequestId { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public string FormTypeCode { get; set; } = string.Empty;
    public string FormTypeName { get; set; } = string.Empty;
    public int Status { get; set; }
    public int? CurrentStepNo { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class PendingApprovalListItemDto
{
    public Guid ApprovalId { get; set; }
    public Guid RequestId { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public int StepNo { get; set; }
    public Guid? AssigneeUserId { get; set; }
    public Guid? AssigneeRoleId { get; set; }
    public Guid RequestorUserId { get; set; }
    public string FormTypeName { get; set; } = string.Empty;
    public long ApprovalConcurrencyToken { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class ApprovalActionRequestDto
{
    public Guid RequestId { get; set; }
    public Guid ApprovalId { get; set; }
    public Guid ActorUserId { get; set; }
    public long ApprovalConcurrencyToken { get; set; }
    public int ActionType { get; set; }
    public string? Comment { get; set; }
}

public sealed class FormRequestValueDto
{
    public string FieldKey { get; set; } = string.Empty;
    public string? ValueText { get; set; }
}

public sealed class FormRequestDetailedDto
{
    public Guid RequestId { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public string FormTypeCode { get; set; } = string.Empty;
    public int Status { get; set; }
    public long ConcurrencyToken { get; set; }
    public IReadOnlyList<FormRequestValueDto> Values { get; set; } = [];
}
