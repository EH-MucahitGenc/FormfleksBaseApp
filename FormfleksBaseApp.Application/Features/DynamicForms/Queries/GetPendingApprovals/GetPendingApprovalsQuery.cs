using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetPendingApprovals;

public sealed record GetPendingApprovalsQuery(Guid ActorUserId) : IRequest<IReadOnlyList<PendingApprovalListItemDto>>;
