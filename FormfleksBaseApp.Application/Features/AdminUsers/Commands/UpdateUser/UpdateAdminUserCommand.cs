using FormfleksBaseApp.Application.Features.AdminUsers.DTOs;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminUsers.Commands.UpdateUser;

public sealed record UpdateAdminUserCommand(Guid Id, UpdateUserDto Request) : IRequest;
