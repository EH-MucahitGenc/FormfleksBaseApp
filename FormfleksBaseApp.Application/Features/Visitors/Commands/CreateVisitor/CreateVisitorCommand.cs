using FormfleksBaseApp.Contracts.Common;
using FormfleksBaseApp.Contracts.Visitors;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Visitors.Commands.CreateVisitor;

public sealed record CreateVisitorCommand(CreateVisitorRequestDto Request) : IRequest<Result<Guid>>;
