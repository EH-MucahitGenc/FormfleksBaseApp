using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.DynamicForms.Business.Queries.GetRequestDetailed;

public sealed record GetRequestDetailedQuery(Guid RequestId, Guid RequestorUserId)
    : IRequest<FormRequestDetailedDto?>;
