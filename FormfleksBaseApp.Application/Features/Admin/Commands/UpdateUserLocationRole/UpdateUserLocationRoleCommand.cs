using MediatR;
using System;

namespace FormfleksBaseApp.Application.Features.Admin.Commands.UpdateUserLocationRole;

public class UpdateUserLocationRoleCommand : IRequest<bool>
{
    public Guid Id { get; set; }
    public string? LocationName { get; set; }
    public bool IsGlobalManager { get; set; }
    public bool IsActive { get; set; }
}
