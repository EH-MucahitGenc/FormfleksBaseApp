using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Services;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetMyRequests;

public sealed class GetMyRequestsQueryHandler : IRequestHandler<GetMyRequestsQuery, IReadOnlyList<MyFormRequestListItemDto>>
{
    private readonly IFormRequestService _service;

    public GetMyRequestsQueryHandler(IFormRequestService service)
    {
        _service = service;
    }

    public async Task<IReadOnlyList<MyFormRequestListItemDto>> Handle(GetMyRequestsQuery request, CancellationToken ct)
    {
        var result = await _service.GetMyRequestsAsync(request.RequestorUserId, ct);
        return result;
    }
}
