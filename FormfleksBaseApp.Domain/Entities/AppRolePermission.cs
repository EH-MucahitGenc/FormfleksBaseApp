using System.ComponentModel.DataAnnotations.Schema;

namespace FormfleksBaseApp.Domain.Entities;

/// <summary>
/// Roller (<see cref="AppRole"/>) ve Yetkiler (<see cref="AppPermission"/>) arasındaki çoka-çok ilişkiyi temsil eden ara tablo (Entity).
/// Hangi rolün hangi yetkilere sahip olduğunu tutar.
/// </summary>
[Table("role_permissions", Schema = "public")]
public class AppRolePermission
{
    public Guid RoleId { get; set; }
    public AppRole Role { get; set; } = default!;

    public Guid PermissionId { get; set; }
    public AppPermission Permission { get; set; } = default!;
}
