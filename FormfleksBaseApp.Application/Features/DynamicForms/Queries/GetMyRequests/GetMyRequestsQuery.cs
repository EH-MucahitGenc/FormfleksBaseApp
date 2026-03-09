using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetMyRequests;

public sealed record GetMyRequestsQuery(Guid RequestorUserId) : IRequest<IReadOnlyList<MyFormRequestListItemDto>>;
