namespace FormfleksBaseApp.Domain.Entities;

/// <summary>
/// Sistemdeki rolleri ve yetki gruplarını temsil eden temel varlık (Entity).
/// </summary>
public class AppRole : BaseEntity
{
    public string Name { get; set; } = default!;
    public string? Description { get; set; }

    public ICollection<AppUserRole> UserRoles { get; set; } = [];
    public ICollection<AppRolePermission> RolePermissions { get; set; } = [];
}
