using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using MediatR;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Microsoft.EntityFrameworkCore;
using FormfleksBaseApp.Application.Common;

namespace FormfleksBaseApp.Application.Features.Admin.Commands.CreateUserLocationRole;

public class CreateUserLocationRoleCommandHandler : IRequestHandler<CreateUserLocationRoleCommand, Guid>
{
    private readonly IDynamicFormsDbContext _db;

    public CreateUserLocationRoleCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<Guid> Handle(CreateUserLocationRoleCommand request, CancellationToken ct)
    {
        var existingRoles = await _db.UserLocationRoles
            .Where(x => x.UserId == request.UserId && x.RoleId == request.RoleId)
            .ToListAsync(ct);

        if (request.IsGlobalManager || request.LocationNames == null || request.LocationNames.Count == 0)
        {
            if (existingRoles.Any(x => x.IsGlobalManager))
            {
                throw new BusinessException("Bu kullanıcı için bu rolde zaten Global (Tüm Şubeler) yetkisi bulunmaktadır.");
            }

            var entity = new UserLocationRoleEntity
            {
                Id = Guid.NewGuid(),
                UserId = request.UserId,
                RoleId = request.RoleId,
                LocationName = null,
                IsGlobalManager = true,
                IsActive = request.IsActive
            };
            _db.UserLocationRoles.Add(entity);
            await _db.SaveChangesAsync(ct);
            return entity.Id;
        }

        Guid lastId = Guid.Empty;
        foreach (var loc in request.LocationNames)
        {
            if (existingRoles.Any(x => x.LocationName == loc))
            {
                throw new BusinessException($"Bu kullanıcı için bu rolde '{loc}' şubesine ait yetki zaten bulunmaktadır.");
            }

            var entity = new UserLocationRoleEntity
            {
                Id = Guid.NewGuid(),
                UserId = request.UserId,
                RoleId = request.RoleId,
                LocationName = loc,
                IsGlobalManager = false,
                IsActive = request.IsActive
            };
            _db.UserLocationRoles.Add(entity);
            lastId = entity.Id;
        }

        await _db.SaveChangesAsync(ct);
        return lastId;
    }
}
