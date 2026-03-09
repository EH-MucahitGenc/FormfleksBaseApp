using FormfleksBaseApp.Application.Features.AdminUsers.DTOs;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminUsers.Queries.GetRoles;

public sealed record GetAdminRolesQuery : IRequest<List<RoleDto>>
{
}
