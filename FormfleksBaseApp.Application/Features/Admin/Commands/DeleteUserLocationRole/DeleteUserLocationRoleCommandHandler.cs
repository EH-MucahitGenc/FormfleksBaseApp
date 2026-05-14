using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Admin.Commands.DeleteUserLocationRole;

public class DeleteUserLocationRoleCommandHandler : IRequestHandler<DeleteUserLocationRoleCommand, bool>
{
    private readonly IDynamicFormsDbContext _db;

    public DeleteUserLocationRoleCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<bool> Handle(DeleteUserLocationRoleCommand request, CancellationToken ct)
    {
        var entity = await _db.UserLocationRoles.FindAsync(new object[] { request.Id }, ct);
        if (entity == null)
            return false;

        entity.IsActive = false;
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
