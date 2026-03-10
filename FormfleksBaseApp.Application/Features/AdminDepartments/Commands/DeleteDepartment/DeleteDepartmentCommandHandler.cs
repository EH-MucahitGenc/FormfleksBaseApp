using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.AdminDepartments.Commands.DeleteDepartment;

public sealed class DeleteDepartmentCommandHandler : IRequestHandler<DeleteDepartmentCommand>
{
    private readonly IDynamicFormsDbContext _db;

    public DeleteDepartmentCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task Handle(DeleteDepartmentCommand request, CancellationToken ct)
    {
        var department = await _db.Departments.FirstOrDefaultAsync(d => d.Id == request.Id, ct);
        if (department is null)
            throw new ArgumentException($"Department with ID {request.Id} not found");

        var hasUsers = await _db.UserDepartments.AnyAsync(ud => ud.DepartmentId == request.Id, ct);
        if (hasUsers)
            throw new InvalidOperationException("Bu departman kullanıcılara atandığı için silinemez. Önce kullanıcı ilişkilerini kaldırın.");

        _db.Departments.Remove(department);
        await _db.SaveChangesAsync(ct);
    }
}
