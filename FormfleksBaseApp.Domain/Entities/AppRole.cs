namespace FormfleksBaseApp.Domain.Entities;

public class AppRole : BaseEntity
{
    public string Name { get; set; } = default!;
    public string? Description { get; set; }

    public ICollection<AppUserRole> UserRoles { get; set; } = [];
    public ICollection<AppRolePermission> RolePermissions { get; set; } = [];
}
