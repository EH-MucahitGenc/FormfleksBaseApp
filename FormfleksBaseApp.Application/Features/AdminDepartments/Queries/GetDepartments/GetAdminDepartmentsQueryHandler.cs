using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.AdminDepartments.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.AdminDepartments.Queries.GetDepartments;

public sealed class GetAdminDepartmentsQueryHandler : IRequestHandler<GetAdminDepartmentsQuery, IReadOnlyList<AdminDepartmentDto>>
{
    private readonly IDynamicFormsDbContext _db;

    public GetAdminDepartmentsQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<AdminDepartmentDto>> Handle(GetAdminDepartmentsQuery request, CancellationToken ct)
    {
        return await _db.Departments
            .AsNoTracking()
            .OrderBy(d => d.Code)
            .Select(d => new AdminDepartmentDto
            {
                Id = d.Id,
                Code = d.Code,
                Name = d.Name,
                Active = d.Active
            })
            .ToListAsync(ct);
    }
}
