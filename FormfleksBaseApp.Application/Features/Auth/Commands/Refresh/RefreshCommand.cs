using FormfleksBaseApp.Application.Auth.Dtos;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Auth.Commands.Refresh;

public sealed record RefreshCommand(RefreshRequest Request) : IRequest<AuthResponse>;
