using FormfleksBaseApp.Application.Features.AdminRoles.Dtos;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminRoles.Queries.GetPermissions;

public sealed record GetPermissionsQuery : IRequest<IReadOnlyList<PermissionDto>>;
