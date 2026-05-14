using MediatR;
using System;

namespace FormfleksBaseApp.Application.Features.Admin.Commands.CreateUserLocationRole;

public class CreateUserLocationRoleCommand : IRequest<Guid>
{
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
    public List<string>? LocationNames { get; set; }
    public bool IsGlobalManager { get; set; }
    public bool IsActive { get; set; }
}
