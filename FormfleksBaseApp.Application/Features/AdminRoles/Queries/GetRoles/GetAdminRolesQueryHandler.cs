using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.AdminRoles.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.AdminRoles.Queries.GetRoles;

public sealed class GetAdminRolesQueryHandler : IRequestHandler<GetAdminRolesQuery, IReadOnlyList<AdminRoleDto>>
{
    private readonly IDynamicFormsDbContext _db;

    public GetAdminRolesQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<AdminRoleDto>> Handle(GetAdminRolesQuery request, CancellationToken ct)
    {
        return await _db.Roles
            .AsNoTracking()
            .OrderBy(r => r.Code)
            .Select(r => new AdminRoleDto
            {
                Id = r.Id,
                Code = r.Code,
                Name = r.Name,
                Active = r.Active
            })
            .ToListAsync(ct);
    }
}
