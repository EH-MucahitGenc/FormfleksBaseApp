using FormfleksBaseApp.Contracts.Common;
using FormfleksBaseApp.Contracts.Visitors;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Visitors.Queries.GetVisitors;

public sealed record GetVisitorsQuery() : IRequest<Result<IReadOnlyList<VisitorDto>>>;
