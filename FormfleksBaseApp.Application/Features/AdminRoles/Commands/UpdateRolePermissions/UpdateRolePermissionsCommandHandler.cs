using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminRoles.Commands.UpdateRolePermissions;

public sealed class UpdateRolePermissionsCommandHandler : IRequestHandler<UpdateRolePermissionsCommand>
{
    private readonly IRolePermissionRepository _repository;

    public UpdateRolePermissionsCommandHandler(IRolePermissionRepository repository)
    {
        _repository = repository;
    }

    public async Task Handle(UpdateRolePermissionsCommand request, CancellationToken cancellationToken)
    {
        await _repository.UpdateRolePermissionsAsync(request.RoleId, request.Permissions, cancellationToken);
    }
}
