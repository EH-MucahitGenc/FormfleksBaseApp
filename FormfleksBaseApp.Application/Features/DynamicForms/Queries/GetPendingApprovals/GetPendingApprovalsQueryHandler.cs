using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Services;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetPendingApprovals;

public sealed class GetPendingApprovalsQueryHandler : IRequestHandler<GetPendingApprovalsQuery, IReadOnlyList<PendingApprovalListItemDto>>
{
    private readonly IApprovalService _service;

    public GetPendingApprovalsQueryHandler(IApprovalService service)
    {
        _service = service;
    }

    public async Task<IReadOnlyList<PendingApprovalListItemDto>> Handle(GetPendingApprovalsQuery request, CancellationToken ct)
    {
        var approvals = await _service.GetPendingApprovalsAsync(request.ActorUserId, ct);
        return approvals;
    }
}
