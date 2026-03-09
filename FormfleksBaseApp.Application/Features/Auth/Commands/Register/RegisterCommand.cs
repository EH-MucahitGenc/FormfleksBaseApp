using FormfleksBaseApp.Application.Auth.Dtos;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Auth.Commands.Register;

public sealed record RegisterCommand(RegisterRequest Request) : IRequest<Unit>;
