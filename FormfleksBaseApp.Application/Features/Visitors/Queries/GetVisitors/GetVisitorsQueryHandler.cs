using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Contracts.Common;
using FormfleksBaseApp.Contracts.Visitors;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Visitors.Queries.GetVisitors;

public sealed class GetVisitorsQueryHandler : IRequestHandler<GetVisitorsQuery, Result<IReadOnlyList<VisitorDto>>>
{
    private readonly IVisitorRepository _repo;

    public GetVisitorsQueryHandler(IVisitorRepository repo)
    {
        _repo = repo;
    }

    public async Task<Result<IReadOnlyList<VisitorDto>>> Handle(GetVisitorsQuery request, CancellationToken cancellationToken)
    {
        var visitors = await _repo.GetActiveVisitorsAsync(cancellationToken);
        return Result<IReadOnlyList<VisitorDto>>.Success(visitors);
    }
}
