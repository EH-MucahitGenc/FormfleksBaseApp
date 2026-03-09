using FormfleksBaseApp.Application.Auth.Dtos;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Auth.Commands.Logout;

public sealed record LogoutCommand(RefreshRequest Request) : IRequest<Unit>;
