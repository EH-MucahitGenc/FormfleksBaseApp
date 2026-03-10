using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminRoles.Commands.CreateRole;

public sealed class CreateRoleCommand : IRequest<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool Active { get; set; }
}
