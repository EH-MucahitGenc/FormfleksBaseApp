using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminRoles.Commands.UpdateRolePermissions;

public sealed class UpdateRolePermissionsCommand : IRequest
{
    public Guid RoleId { get; set; }
    public List<string> Permissions { get; set; } = new();
}
