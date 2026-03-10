using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminDepartments.Commands.CreateDepartment;

public sealed class CreateDepartmentCommand : IRequest<Guid>
{
    public string Name { get; set; } = string.Empty;
    public string Code { get; set; } = string.Empty;
    public bool Active { get; set; }
}
