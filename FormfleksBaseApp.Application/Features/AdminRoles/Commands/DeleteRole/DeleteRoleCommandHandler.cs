using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.AdminRoles.Commands.DeleteRole;

public sealed class DeleteRoleCommandHandler : IRequestHandler<DeleteRoleCommand>
{
    private readonly IDynamicFormsDbContext _db;

    public DeleteRoleCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task Handle(DeleteRoleCommand request, CancellationToken ct)
    {
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Id == request.Id, ct);
        if (role is null)
            throw new ArgumentException($"Role entity with ID {request.Id} not found");

        var hasUsers = await _db.UserRoles.AnyAsync(ur => ur.RoleId == request.Id, ct);
        if (hasUsers)
            throw new InvalidOperationException("Bu rol kullanıcılara atandığı için silinemez. Önce kullanıcı ilişkilerini kaldırın.");

        _db.Roles.Remove(role);
        await _db.SaveChangesAsync(ct);
    }
}
