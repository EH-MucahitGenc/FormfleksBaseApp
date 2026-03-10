using FormfleksBaseApp.Application.Features.AdminRoles.Dtos;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminRoles.Queries.GetRoles;

public sealed record GetAdminRolesQuery : IRequest<IReadOnlyList<AdminRoleDto>>;
