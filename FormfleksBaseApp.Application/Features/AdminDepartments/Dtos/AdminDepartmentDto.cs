namespace FormfleksBaseApp.Application.Features.AdminDepartments.Dtos;

public sealed class AdminDepartmentDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool Active { get; set; }
}
