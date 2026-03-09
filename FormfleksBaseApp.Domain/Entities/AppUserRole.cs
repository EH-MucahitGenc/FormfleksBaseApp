namespace FormfleksBaseApp.Domain.Entities;

public class AppUserRole
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = default!;

    public Guid RoleId { get; set; }
    public AppRole Role { get; set; } = default!;
}
