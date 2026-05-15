using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.AdminRoles.Dtos;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminRoles.Queries.GetPermissions;

public sealed class GetPermissionsQueryHandler : IRequestHandler<GetPermissionsQuery, IReadOnlyList<PermissionDto>>
{
    private readonly IRolePermissionRepository _repository;

    public GetPermissionsQueryHandler(IRolePermissionRepository repository)
    {
        _repository = repository;
    }

    public Task<IReadOnlyList<PermissionDto>> Handle(GetPermissionsQuery request, CancellationToken ct)
    {
        return _repository.GetAllPermissionsAsync(ct);
    }
}
