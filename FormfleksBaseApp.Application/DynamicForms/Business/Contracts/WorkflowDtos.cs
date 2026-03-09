namespace FormfleksBaseApp.DynamicForms.Business.Contracts;

public sealed record FormTemplateRoleDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

public sealed record FormTemplateWorkflowDto
{
    public Guid TemplateId { get; init; }
    public List<FormTemplateWorkflowStepDto> Steps { get; init; } = new();
}

public sealed record FormTemplateWorkflowStepDto
{
    public int StepOrder { get; init; }
    public Guid RoleId { get; init; }
}
