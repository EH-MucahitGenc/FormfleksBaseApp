using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetUserLocationRoles;

public class GetUserLocationRolesQueryHandler : IRequestHandler<GetUserLocationRolesQuery, List<UserLocationRoleDto>>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IUserRepository _userRepository;

    public GetUserLocationRolesQueryHandler(IDynamicFormsDbContext db, IUserRepository userRepository)
    {
        _db = db;
        _userRepository = userRepository;
    }

    public async Task<List<UserLocationRoleDto>> Handle(GetUserLocationRolesQuery request, CancellationToken ct)
    {
        var entities = await _db.UserLocationRoles
            .AsNoTracking()
            .OrderByDescending(x => x.IsActive)
            .ThenBy(x => x.LocationName)
            .ToListAsync(ct);

        var result = new List<UserLocationRoleDto>();

        foreach (var entity in entities)
        {
            var user = await _userRepository.GetByIdAsync(entity.UserId, ct, false);
            var role = await _db.Roles.AsNoTracking().FirstOrDefaultAsync(r => r.Id == entity.RoleId, ct);

            result.Add(new UserLocationRoleDto
            {
                Id = entity.Id,
                UserId = entity.UserId,
                UserFullName = user?.DisplayName ?? "Bilinmeyen Kullanıcı",
                UserEmail = user?.Email ?? "",
                RoleId = entity.RoleId,
                RoleName = role?.Name ?? "Bilinmeyen Rol",
                LocationName = entity.LocationName,
                IsGlobalManager = entity.IsGlobalManager,
                IsActive = entity.IsActive
            });
        }

        return result;
    }
}
