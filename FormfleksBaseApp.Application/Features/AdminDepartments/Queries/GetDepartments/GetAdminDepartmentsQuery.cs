using FormfleksBaseApp.Application.Features.AdminDepartments.Dtos;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminDepartments.Queries.GetDepartments;

public sealed record GetAdminDepartmentsQuery : IRequest<IReadOnlyList<AdminDepartmentDto>>;
