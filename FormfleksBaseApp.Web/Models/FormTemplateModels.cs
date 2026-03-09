namespace FormfleksBaseApp.Web.Models;

public sealed class FormTemplateUpsertDto
{
    public Guid? FormTypeId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool Active { get; set; } = true;
    public List<FormTemplateSectionUpsertDto> Sections { get; set; } = [];
    public List<FormTemplateFieldUpsertDto> Fields { get; set; } = [];
    public List<FormTemplateWorkflowStepUpsertDto> WorkflowSteps { get; set; } = [];
}

public sealed class FormTemplateSectionUpsertDto
{
    public string Title { get; set; } = string.Empty;
    public int SortOrder { get; set; }
}

public sealed class FormTemplateFieldUpsertDto
{
    public string FieldKey { get; set; } = string.Empty;
    public string Label { get; set; } = string.Empty;
    public int FieldType { get; set; } = 1;
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
    public string Name { get; set; } = string.Empty;
    public int AssigneeType { get; set; } = 2;
    public Guid? AssigneeUserId { get; set; }
    public Guid? AssigneeRoleId { get; set; }
    public string? DynamicRuleJson { get; set; }
    public bool AllowReturnForRevision { get; set; } = true;
}

public sealed class FormTemplateSummaryDto
{
    public Guid FormTypeId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool Active { get; set; }
    public int FieldCount { get; set; }
    public int WorkflowStepCount { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class RoleLookupDto
{
    public Guid RoleId { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
}
