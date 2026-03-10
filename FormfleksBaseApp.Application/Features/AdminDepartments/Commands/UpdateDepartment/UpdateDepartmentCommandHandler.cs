using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.AdminDepartments.Commands.UpdateDepartment;

public sealed class UpdateDepartmentCommandHandler : IRequestHandler<UpdateDepartmentCommand>
{
    private readonly IDynamicFormsDbContext _db;

    public UpdateDepartmentCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task Handle(UpdateDepartmentCommand request, CancellationToken ct)
    {
        var department = await _db.Departments.FirstOrDefaultAsync(d => d.Id == request.Id, ct);
        if (department is null)
            throw new ArgumentException($"Department with ID {request.Id} not found");

        var existingCode = await _db.Departments.FirstOrDefaultAsync(d => d.Code == request.Code && d.Id != request.Id, ct);
        if (existingCode is not null)
            throw new InvalidOperationException("Bu koda sahip farklı bir departman zaten mevcut.");

        department.Name = request.Name;
        department.Code = request.Code;
        department.Active = request.Active;

        await _db.SaveChangesAsync(ct);
    }
}
