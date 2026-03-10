using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminRoles.Commands.UpdateRole;

public sealed class UpdateRoleCommand : IRequest
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool Active { get; set; }
}
