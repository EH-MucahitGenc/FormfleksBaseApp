using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminRoles.Queries.GetRolePermissions;

public sealed record GetRolePermissionsQuery(Guid RoleId) : IRequest<IReadOnlyList<string>>;
