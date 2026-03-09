using FormfleksBaseApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Metadata.Builders;

namespace FormfleksBaseApp.Infrastructure.Persistence;

public class AppDbContext : DbContext
{
    public AppDbContext(DbContextOptions<AppDbContext> options) : base(options) { }

    public DbSet<AppUser> Users => Set<AppUser>();
    public DbSet<RefreshToken> RefreshTokens => Set<RefreshToken>();
    
    public DbSet<AppRole> Roles => Set<AppRole>();
    public DbSet<AppPermission> Permissions => Set<AppPermission>();
    public DbSet<AppUserRole> UserRoles => Set<AppUserRole>();
    public DbSet<AppRolePermission> RolePermissions => Set<AppRolePermission>();

    public override int SaveChanges()
    {
        ApplyAuditRules();
        return base.SaveChanges();
    }

    public override int SaveChanges(bool acceptAllChangesOnSuccess)
    {
        ApplyAuditRules();
        return base.SaveChanges(acceptAllChangesOnSuccess);
    }

    public override Task<int> SaveChangesAsync(CancellationToken cancellationToken = default)
    {
        ApplyAuditRules();
        return base.SaveChangesAsync(cancellationToken);
    }

    public override Task<int> SaveChangesAsync(bool acceptAllChangesOnSuccess, CancellationToken cancellationToken = default)
    {
        ApplyAuditRules();
        return base.SaveChangesAsync(acceptAllChangesOnSuccess, cancellationToken);
    }

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        base.OnModelCreating(modelBuilder);

        modelBuilder.Entity<AppUser>(e =>
        {
            e.ToTable("users");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);

            e.Property(x => x.Email)
             .HasColumnName("email")
             .IsRequired()
             .HasColumnType("character varying(320)")
             .HasMaxLength(320);

            e.Property(x => x.AuthProvider)
             .HasColumnName("auth_provider")
             .IsRequired()
             .HasColumnType("character varying(30)")
             .HasMaxLength(30)
             .HasDefaultValue("Local");

            e.Property(x => x.ExternalId)
             .HasColumnName("external_id")
             .HasColumnType("character varying(200)")
             .HasMaxLength(200);

            e.Property(x => x.DisplayName)
             .HasColumnName("display_name")
             .HasColumnType("character varying(200)")
             .HasMaxLength(200);

            e.Property(x => x.PasswordHash)
             .HasColumnName("password_hash")
             .HasColumnType("character varying(500)")
             .HasMaxLength(500);

            e.HasIndex(x => x.Email).IsUnique();
            e.HasIndex(x => new { x.AuthProvider, x.ExternalId })
             .IsUnique()
             .HasFilter("external_id IS NOT NULL");

            e.HasMany(x => x.RefreshTokens)
             .WithOne(x => x.User)
             .HasForeignKey(x => x.UserId)
             .OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<RefreshToken>(e =>
        {
            e.ToTable("refresh_tokens");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);

            e.Property(x => x.UserId)
             .HasColumnName("user_id")
             .HasColumnType("uuid");

            e.Property(x => x.TokenHash)
             .HasColumnName("token_hash")
             .IsRequired()
             .HasColumnType("character varying(200)")
             .HasMaxLength(200);

            e.Property(x => x.ExpiresAt)
             .HasColumnName("expires_at")
             .HasColumnType("timestamp with time zone")
             .IsRequired();

            e.Property(x => x.RevokedAt)
             .HasColumnName("revoked_at")
             .HasColumnType("timestamp with time zone");

            e.Property(x => x.ReplacedByTokenHash)
             .HasColumnName("replaced_by_token_hash")
             .HasColumnType("character varying(200)")
             .HasMaxLength(200);

            e.HasIndex(x => x.UserId);
            e.HasIndex(x => x.TokenHash).IsUnique();
        });

        modelBuilder.Entity<AppRole>(e =>
        {
            e.ToTable("roles");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);

            e.Property(x => x.Name).HasColumnName("name").IsRequired().HasColumnType("character varying(100)").HasMaxLength(100);
            e.Property(x => x.Description).HasColumnName("description").HasColumnType("character varying(500)").HasMaxLength(500);

            e.HasIndex(x => x.Name).IsUnique();
        });

        modelBuilder.Entity<AppPermission>(e =>
        {
            e.ToTable("permissions");
            e.HasKey(x => x.Id);
            ConfigureBaseEntity(e);

            e.Property(x => x.Name).HasColumnName("name").IsRequired().HasColumnType("character varying(100)").HasMaxLength(100);
            e.Property(x => x.Description).HasColumnName("description").HasColumnType("character varying(500)").HasMaxLength(500);

            e.HasIndex(x => x.Name).IsUnique();
        });

        modelBuilder.Entity<AppUserRole>(e =>
        {
            e.ToTable("user_roles");
            e.HasKey(x => new { x.UserId, x.RoleId });

            e.Property(x => x.UserId).HasColumnName("user_id").HasColumnType("uuid");
            e.Property(x => x.RoleId).HasColumnName("role_id").HasColumnType("uuid");

            e.HasOne(x => x.User).WithMany(u => u.UserRoles).HasForeignKey(x => x.UserId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Role).WithMany(r => r.UserRoles).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
        });

        modelBuilder.Entity<AppRolePermission>(e =>
        {
            e.ToTable("role_permissions");
            e.HasKey(x => new { x.RoleId, x.PermissionId });

            e.Property(x => x.RoleId).HasColumnName("role_id").HasColumnType("uuid");
            e.Property(x => x.PermissionId).HasColumnName("permission_id").HasColumnType("uuid");

            e.HasOne(x => x.Role).WithMany(r => r.RolePermissions).HasForeignKey(x => x.RoleId).OnDelete(DeleteBehavior.Cascade);
            e.HasOne(x => x.Permission).WithMany(p => p.RolePermissions).HasForeignKey(x => x.PermissionId).OnDelete(DeleteBehavior.Cascade);
        });
    }

    private static void ConfigureBaseEntity<TEntity>(EntityTypeBuilder<TEntity> e)
        where TEntity : BaseEntity
    {
        e.Property(x => x.Id)
            .HasColumnName("id")
            .HasColumnType("uuid")
            .ValueGeneratedNever();

        e.Property(x => x.CreatedAt)
            .HasColumnName("created_at")
            .IsRequired()
            .HasColumnType("timestamp with time zone")
            .HasDefaultValueSql("CURRENT_TIMESTAMP")
            .ValueGeneratedOnAdd();

        e.Property(x => x.UpdatedAt)
            .HasColumnName("updated_at")
            .HasColumnType("timestamp with time zone")
            .IsRequired(false);

        e.Property(x => x.Active)
            .HasColumnName("active")
            .IsRequired()
            .HasColumnType("boolean")
            .HasDefaultValue(true);
    }

    private void ApplyAuditRules()
    {
        var now = DateTime.UtcNow;

        foreach (var entry in ChangeTracker.Entries<BaseEntity>())
        {
            if (entry.State == EntityState.Added)
            {
                if (entry.Entity.Id == Guid.Empty)
                    entry.Entity.Id = Guid.NewGuid();

                entry.Entity.UpdatedAt = null;
            }
            else if (entry.State == EntityState.Modified)
            {
                entry.Property(x => x.CreatedAt).IsModified = false;
                entry.Entity.UpdatedAt = now;
            }
        }
    }
}
