using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Features.AdminUsers.Interfaces;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminUsers.Commands.DeleteUser;

public sealed class DeleteAdminUserCommandHandler : IRequestHandler<DeleteAdminUserCommand>
{
    private readonly IAdminUserRepository _repository;

    public DeleteAdminUserCommandHandler(IAdminUserRepository repository)
    {
        _repository = repository;
    }

    public async Task Handle(DeleteAdminUserCommand request, CancellationToken ct)
    {
        var user = await _repository.GetUserByIdWithRolesAsync(request.Id, ct);
        if (user is null)
            throw new BusinessException("Kullanıcı bulunamadı.");

        user.Active = false;
        user.UpdatedAt = DateTime.UtcNow;

        await _repository.SaveChangesAsync(ct);
    }
}
