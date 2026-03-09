using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Features.AdminUsers.Interfaces;
using FormfleksBaseApp.Domain.Entities;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminUsers.Commands.UpdateUser;

public sealed class UpdateAdminUserCommandHandler : IRequestHandler<UpdateAdminUserCommand>
{
    private readonly IAdminUserRepository _repository;

    public UpdateAdminUserCommandHandler(IAdminUserRepository repository)
    {
        _repository = repository;
    }

    public async Task Handle(UpdateAdminUserCommand request, CancellationToken ct)
    {
        var user = await _repository.GetUserByIdWithRolesAsync(request.Id, ct);

        if (user is null)
            throw new BusinessException("Kullanıcı bulunamadı.");

        if (request.Request.DisplayName is not null)
        {
            user.DisplayName = request.Request.DisplayName.Trim();
        }

        user.UpdatedAt = DateTime.UtcNow;

        if (request.Request.RoleIds is { Count: > 0 })
        {
            var existingRoles = user.UserRoles.ToList();
            _repository.RemoveUserRoles(existingRoles);

            foreach (var roleId in request.Request.RoleIds)
            {
                _repository.AddUserRole(new AppUserRole
                {
                    UserId = user.Id,
                    RoleId = roleId
                });
            }
        }

        await _repository.SaveChangesAsync(ct);
    }
}
