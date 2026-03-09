namespace FormfleksBaseApp.Application.Features.AdminUsers.DTOs;

public sealed record AdminUserDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
    public string Email { get; init; } = string.Empty;
    public List<string> Roles { get; init; } = new();
    public bool IsActive { get; init; }
}

public sealed record RoleDto
{
    public Guid Id { get; init; }
    public string Name { get; init; } = string.Empty;
}

public sealed record UpdateUserDto
{
    public string? DisplayName { get; init; }
    public List<Guid>? RoleIds { get; init; }
}
