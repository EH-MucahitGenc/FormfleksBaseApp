using System.ComponentModel.DataAnnotations.Schema;

namespace FormfleksBaseApp.Domain.Entities;

/// <summary>
/// Kullanıcılar (<see cref="AppUser"/>) ve Roller (<see cref="AppRole"/>) arasındaki çoka-çok ilişkiyi temsil eden ara tablo (Entity).
/// </summary>
[Table("user_roles", Schema = "public")]
public class AppUserRole
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = default!;

    public Guid RoleId { get; set; }
    public AppRole Role { get; set; } = default!;
}
