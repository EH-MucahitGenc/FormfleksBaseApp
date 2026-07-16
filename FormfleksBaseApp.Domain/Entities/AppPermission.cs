using System.ComponentModel.DataAnnotations.Schema;

namespace FormfleksBaseApp.Domain.Entities;

/// <summary>
/// Sistemde tanımlı olan yetkileri (Örn: "users.view", "forms.manage") temsil eden varlık.
/// Bu yetkiler rollere atanarak sistem içerisindeki yetkilendirme mekanizmasını oluşturur.
/// </summary>
[Table("permissions", Schema = "public")]
public class AppPermission : BaseEntity
{
    public string Name { get; set; } = default!; // Örn: "users.view", "forms.manage"
    public string? Description { get; set; }
    
    public ICollection<AppRolePermission> RolePermissions { get; set; } = [];
}
