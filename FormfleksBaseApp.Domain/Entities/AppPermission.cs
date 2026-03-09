namespace FormfleksBaseApp.Domain.Entities;

public class AppPermission : BaseEntity
{
    public string Name { get; set; } = default!; // Örn: "users.view", "forms.manage"
    public string? Description { get; set; }
    
    public ICollection<AppRolePermission> RolePermissions { get; set; } = [];
}
