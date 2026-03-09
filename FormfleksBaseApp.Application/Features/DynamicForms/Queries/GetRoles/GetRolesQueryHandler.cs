using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetRoles;

public sealed class GetRolesQueryHandler : IRequestHandler<GetRolesQuery, IReadOnlyList<FormTemplateRoleDto>>
{
    private readonly IDynamicFormsDbContext _db;

    public GetRolesQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<FormTemplateRoleDto>> Handle(GetRolesQuery request, CancellationToken ct)
    {
        return await _db.Roles
            .AsNoTracking()
            .Where(r => r.Active)
            .OrderBy(r => r.Name)
            .Select(r => new FormTemplateRoleDto { Id = r.Id, Name = r.Name })
            .ToListAsync(ct);
    }
}
