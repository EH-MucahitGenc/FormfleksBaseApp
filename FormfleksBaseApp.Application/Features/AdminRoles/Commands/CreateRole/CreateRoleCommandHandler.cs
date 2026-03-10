using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.AdminRoles.Commands.CreateRole;

public sealed class CreateRoleCommandHandler : IRequestHandler<CreateRoleCommand, Guid>
{
    private readonly IDynamicFormsDbContext _db;

    public CreateRoleCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<Guid> Handle(CreateRoleCommand request, CancellationToken ct)
    {
        var existing = await _db.Roles.FirstOrDefaultAsync(r => r.Code == request.Code, ct);
        if (existing is not null)
            throw new InvalidOperationException("Bu koda sahip bir rol zaten mevcut.");

        var role = new RoleEntity
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Code = request.Code,
            Active = request.Active
        };

        _db.Roles.Add(role);
        await _db.SaveChangesAsync(ct);

        return role.Id;
    }
}
