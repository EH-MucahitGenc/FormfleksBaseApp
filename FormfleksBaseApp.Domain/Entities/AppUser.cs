namespace FormfleksBaseApp.Domain.Entities;

public class AppUser : BaseEntity
{
    public string Email { get; set; } = default!;
    public string AuthProvider { get; set; } = "Local";      // Local | ActiveDirectory
    public string? ExternalId { get; set; }                  // objectGUID vs
    public string? DisplayName { get; set; }                 // istege bagli
    public string? PasswordHash { get; set; }              // AD icin NULL olmali

    public ICollection<RefreshToken> RefreshTokens { get; set; } = new List<RefreshToken>();
    
    public ICollection<AppUserRole> UserRoles { get; set; } = [];
}
