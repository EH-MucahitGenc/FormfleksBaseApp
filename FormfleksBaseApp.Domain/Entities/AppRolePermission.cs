using System.ComponentModel.DataAnnotations.Schema;

namespace FormfleksBaseApp.Domain.Entities;

[Table("role_permissions", Schema = "public")]
public class AppRolePermission
{
    public Guid RoleId { get; set; }
    public AppRole Role { get; set; } = default!;

    public Guid PermissionId { get; set; }
    public AppPermission Permission { get; set; } = default!;
}
