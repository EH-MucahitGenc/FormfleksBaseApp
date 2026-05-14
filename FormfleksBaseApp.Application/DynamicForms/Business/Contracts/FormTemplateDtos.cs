namespace FormfleksBaseApp.DynamicForms.Business.Contracts;

public sealed class FormTemplateUpsertDto
{
    public Guid? FormTypeId { get; set; }
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public bool Active { get; set; } = true;
    public IReadOnlyList<FormTemplateSectionUpsertDto> Sections { get; set; } = [];
    public IReadOnlyList<FormTemplateFieldUpsertDto> Fields { get; set; } = [];
    public IReadOnlyList<FormTemplateWorkflowStepUpsertDto> WorkflowSteps { get; set; } = [];
}

public sealed class FormTemplateSectionUpsertDto
{
    public string Title { get; set; } = default!;
    public int SortOrder { get; set; }
}

public sealed class FormTemplateFieldUpsertDto
{
    public string FieldKey { get; set; } = default!;
    public string Label { get; set; } = default!;
    public int FieldType { get; set; }
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
    public string? SectionTitle { get; set; }
    public string? Placeholder { get; set; }
    public string? HelpText { get; set; }
    public string? DefaultValue { get; set; }
    public string? VisibilityRuleJson { get; set; }
    public string? ValidationRuleJson { get; set; }
    public string? OptionsJson { get; set; }
    public bool Active { get; set; } = true;
}

public sealed class FormTemplateWorkflowStepUpsertDto
{
    public int StepNo { get; set; }
    public string Name { get; set; } = default!;
    public int AssigneeType { get; set; }
    public Guid? AssigneeUserId { get; set; }
    public Guid? AssigneeRoleId { get; set; }
    public string? DynamicRuleJson { get; set; }
    public bool AllowReturnForRevision { get; set; } = true;
    public short FallbackAction { get; set; }
    public Guid? FallbackUserId { get; set; }
    public bool IsParallel { get; set; }
    public Guid? TargetLocationRoleId { get; set; }
}

public sealed class FormTemplateSummaryDto
{
    public Guid FormTypeId { get; set; }
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public bool Active { get; set; }
    public int FieldCount { get; set; }
    public int WorkflowStepCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class RoleLookupDto
{
    public Guid RoleId { get; set; }
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
}
