namespace FormfleksBaseApp.Domain.Entities;

public class AppRolePermission
{
    public Guid RoleId { get; set; }
    public AppRole Role { get; set; } = default!;

    public Guid PermissionId { get; set; }
    public AppPermission Permission { get; set; } = default!;
}
