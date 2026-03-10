namespace FormfleksBaseApp.Application.Features.AdminRoles.Dtos;

public sealed class AdminRoleDto
{
    public Guid Id { get; set; }
    public string Code { get; set; } = string.Empty;
    public string Name { get; set; } = string.Empty;
    public bool Active { get; set; }
}
