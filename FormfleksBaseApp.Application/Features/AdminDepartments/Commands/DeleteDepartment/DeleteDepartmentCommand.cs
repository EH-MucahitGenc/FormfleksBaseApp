using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminDepartments.Commands.DeleteDepartment;

public sealed record DeleteDepartmentCommand(Guid Id) : IRequest;
