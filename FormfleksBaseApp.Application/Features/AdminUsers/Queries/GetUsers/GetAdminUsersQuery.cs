using FormfleksBaseApp.Application.Features.AdminUsers.DTOs;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminUsers.Queries.GetUsers;

public sealed record GetAdminUsersQuery : IRequest<List<AdminUserDto>>
{
}
