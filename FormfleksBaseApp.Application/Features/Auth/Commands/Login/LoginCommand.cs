using FormfleksBaseApp.Application.Auth.Dtos;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Auth.Commands.Login;

public sealed record LoginCommand(LoginRequest Request) : IRequest<AuthResponse>;
