namespace FormfleksBaseApp.DynamicForms.Business.Contracts;

public sealed class FormDefinitionDto
{
    public Guid FormTypeId { get; set; }
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public IReadOnlyList<FormSectionDto> Sections { get; set; } = [];
    public IReadOnlyList<string>? AllowedCreateRoleCodes { get; set; }
}

public sealed class FormSectionDto
{
    public Guid SectionId { get; set; }
    public string Title { get; set; } = default!;
    public int SortOrder { get; set; }
    public IReadOnlyList<FormFieldDto> Fields { get; set; } = [];
}

public sealed class FormFieldDto
{
    public Guid FieldId { get; set; }
    public string Key { get; set; } = default!;
    public string Label { get; set; } = default!;
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
