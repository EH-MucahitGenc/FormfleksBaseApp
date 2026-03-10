using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminRoles.Commands.DeleteRole;

public sealed record DeleteRoleCommand(Guid Id) : IRequest;
