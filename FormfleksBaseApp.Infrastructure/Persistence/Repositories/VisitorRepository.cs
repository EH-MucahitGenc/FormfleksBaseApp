using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Contracts.Visitors;
using FormfleksBaseApp.Domain.Entities;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Infrastructure.Persistence.Repositories;

public sealed class VisitorRepository : IVisitorRepository
{
    private readonly AppDbContext _db;

    public VisitorRepository(AppDbContext db)
    {
        _db = db;
    }

    public async Task<Guid> CreateVisitorAsync(VisitorEntity entity, CancellationToken cancellationToken)
    {
        _db.Visitors.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);
        return entity.Id;
    }

    public async Task<IReadOnlyList<VisitorDto>> GetActiveVisitorsAsync(CancellationToken cancellationToken)
    {
        return await _db.Visitors
            .AsNoTracking()
            .Where(x => x.Active)
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new VisitorDto
            {
                Id = x.Id,
                FirstName = x.FirstName,
                LastName = x.LastName,
                CompanyName = x.CompanyName,
                Purpose = x.Purpose,
                VisitDate = x.VisitDate,
                CreatedAt = x.CreatedAt
            })
            .ToListAsync(cancellationToken);
    }
}
