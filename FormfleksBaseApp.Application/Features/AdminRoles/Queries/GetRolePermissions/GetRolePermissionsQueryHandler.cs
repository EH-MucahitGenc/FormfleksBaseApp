using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminRoles.Queries.GetRolePermissions;

public sealed class GetRolePermissionsQueryHandler : IRequestHandler<GetRolePermissionsQuery, IReadOnlyList<string>>
{
    private readonly IRolePermissionRepository _repository;

    public GetRolePermissionsQueryHandler(IRolePermissionRepository repository)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<string>> Handle(GetRolePermissionsQuery request, CancellationToken ct)
    {
        return _repository.GetRolePermissionsAsync(request.RoleId, ct);
    }
}
