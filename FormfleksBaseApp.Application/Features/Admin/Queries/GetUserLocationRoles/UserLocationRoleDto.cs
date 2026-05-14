using System;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetUserLocationRoles;

public class UserLocationRoleDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserFullName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public Guid RoleId { get; set; }
    public string RoleName { get; set; } = string.Empty;
    public string? LocationName { get; set; }
    public bool IsGlobalManager { get; set; }
    public bool IsActive { get; set; }
}
