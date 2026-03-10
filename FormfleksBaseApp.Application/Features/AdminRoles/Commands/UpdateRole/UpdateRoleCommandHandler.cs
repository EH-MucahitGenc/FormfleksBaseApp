using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.AdminRoles.Commands.UpdateRole;

public sealed class UpdateRoleCommandHandler : IRequestHandler<UpdateRoleCommand>
{
    private readonly IDynamicFormsDbContext _db;

    public UpdateRoleCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task Handle(UpdateRoleCommand request, CancellationToken ct)
    {
        var role = await _db.Roles.FirstOrDefaultAsync(r => r.Id == request.Id, ct);
        if (role is null)
            throw new ArgumentException($"Role entity with ID {request.Id} not found");

        var existingCode = await _db.Roles.FirstOrDefaultAsync(r => r.Code == request.Code && r.Id != request.Id, ct);
        if (existingCode is not null)
            throw new InvalidOperationException("Bu koda sahip farklı bir rol zaten mevcut.");

        role.Name = request.Name;
        role.Code = request.Code;
        role.Active = request.Active;

        await _db.SaveChangesAsync(ct);
    }
}
