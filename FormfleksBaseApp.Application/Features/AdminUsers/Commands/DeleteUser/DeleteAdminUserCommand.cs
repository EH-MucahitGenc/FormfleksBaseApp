using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminUsers.Commands.DeleteUser;

public sealed record DeleteAdminUserCommand(Guid Id) : IRequest;
