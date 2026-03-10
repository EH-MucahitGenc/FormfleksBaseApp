using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminDepartments.Commands.UpdateDepartment;

public sealed class UpdateDepartmentCommand : IRequest
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool Active { get; set; }
}
