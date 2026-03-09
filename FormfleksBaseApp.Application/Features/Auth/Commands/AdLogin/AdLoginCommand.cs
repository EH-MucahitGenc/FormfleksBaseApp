using FormfleksBaseApp.Application.Auth.Dtos;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Auth.Commands.AdLogin;

public sealed record AdLoginCommand(AdLoginRequest Request) : IRequest<AuthResponse>;
