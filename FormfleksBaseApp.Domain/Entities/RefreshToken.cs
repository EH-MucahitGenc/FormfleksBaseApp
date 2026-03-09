namespace FormfleksBaseApp.Domain.Entities;

public class RefreshToken : BaseEntity
{
    public Guid UserId { get; set; }
    public AppUser User { get; set; } = default!;

    // Token'i plain tutmak yerine hash tutuyoruz.
    public string TokenHash { get; set; } = default!;

    public DateTime ExpiresAt { get; set; }

    public DateTime? RevokedAt { get; set; }
    public string? ReplacedByTokenHash { get; set; }

    public bool IsActive => Active && RevokedAt is null && DateTime.UtcNow < ExpiresAt;
}
