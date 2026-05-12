using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetDistinctLocations;

/// <summary>
/// Sistemde kayıtlı olan QDMS personellerinin bağlı olduğu benzersiz (distinct) şube/lokasyon isimlerini listeler.
/// Bu liste, Yönetim Panelinde İK yetkilendirmesi yapılırken şube seçimi (Dropdown/Multi-select) için kullanılacaktır.
/// Sadece aktif personellerin çalıştığı şubeler hesaba katılır.
/// </summary>
public class GetDistinctLocationsQueryHandler : IRequestHandler<GetDistinctLocationsQuery, List<string>>
{
    private readonly IDynamicFormsDbContext _db;

    public GetDistinctLocationsQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<List<string>> Handle(GetDistinctLocationsQuery request, CancellationToken ct)
    {
        var locations = await _db.QdmsPersoneller
            .AsNoTracking()
            .Where(p => p.IsActive && !string.IsNullOrWhiteSpace(p.Isyeri_Tanimi))
            .Select(p => p.Isyeri_Tanimi!)
            .Distinct()
            .OrderBy(l => l)
            .ToListAsync(ct);

        return locations;
    }
}
