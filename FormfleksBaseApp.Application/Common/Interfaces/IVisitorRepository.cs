using FormfleksBaseApp.Contracts.Visitors;
using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IVisitorRepository
{
    Task<IReadOnlyList<VisitorDto>> GetActiveVisitorsAsync(CancellationToken cancellationToken);
    Task<Guid> CreateVisitorAsync(VisitorEntity entity, CancellationToken cancellationToken);
}
