using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetApprovalHistory;

public sealed record GetApprovalHistoryQuery(Guid UserId) : IRequest<IReadOnlyList<HistoryApprovalListItemDto>>;
