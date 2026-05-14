using MediatR;
using System;

namespace FormfleksBaseApp.Application.Features.Admin.Commands.DeleteUserLocationRole;

public class DeleteUserLocationRoleCommand : IRequest<bool>
{
    public Guid Id { get; set; }
}
