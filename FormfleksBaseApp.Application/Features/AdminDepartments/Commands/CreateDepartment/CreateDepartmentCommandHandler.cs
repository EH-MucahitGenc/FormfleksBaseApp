using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.AdminDepartments.Commands.CreateDepartment;

public sealed class CreateDepartmentCommandHandler : IRequestHandler<CreateDepartmentCommand, Guid>
{
    private readonly IDynamicFormsDbContext _db;

    public CreateDepartmentCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<Guid> Handle(CreateDepartmentCommand request, CancellationToken ct)
    {
        var existing = await _db.Departments.FirstOrDefaultAsync(d => d.Code == request.Code, ct);
        if (existing is not null)
            throw new InvalidOperationException("Bu koda sahip bir departman zaten mevcut.");

        var department = new DepartmentEntity
        {
            Id = Guid.NewGuid(),
            Name = request.Name,
            Code = request.Code,
            Active = request.Active
        };

        _db.Departments.Add(department);
        await _db.SaveChangesAsync(ct);

        return department.Id;
    }
}
