using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.AdminUsers.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetPersonnels;

public sealed class GetPersonnelsQueryHandler : IRequestHandler<GetPersonnelsQuery, PagedResult<QdmsPersonelDto>>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IAdminUserRepository _userRepo;

    public GetPersonnelsQueryHandler(IDynamicFormsDbContext db, IAdminUserRepository userRepo)
    {
        _db = db;
        _userRepo = userRepo;
    }

    public async Task<PagedResult<QdmsPersonelDto>> Handle(GetPersonnelsQuery request, CancellationToken ct)
    {
        var localUsers = await _userRepo.GetAllUsersWithRolesAsync(ct);
        var userDict = localUsers.ToDictionary(u => u.Id, u => u.DisplayName ?? u.Email);

        var query = _db.QdmsPersoneller.AsNoTracking().AsQueryable();

        if (request.IsActive.HasValue)
        {
            query = query.Where(p => p.IsActive == request.IsActive.Value);
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var search = request.SearchTerm.ToLower();
            query = query.Where(p => 
                p.Sicil_No.ToLower().Contains(search) || 
                (p.Adi != null && p.Adi.ToLower().Contains(search)) || 
                (p.Soyadi != null && p.Soyadi.ToLower().Contains(search)) ||
                (p.Pozisyon_Aciklamasi != null && p.Pozisyon_Aciklamasi.ToLower().Contains(search))
            );
        }

        var total = await query.CountAsync(ct);

        var items = await query
            .OrderBy(p => p.Sirket).ThenBy(p => p.Adi)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(ct);

        var dtos = items.Select(p => new QdmsPersonelDto
        {
            Id = p.Id,
            Sirket = p.Sirket,
            Isyeri_Tanimi = p.Isyeri_Tanimi,
            Sicil_No = p.Sicil_No,
            Adi = p.Adi,
            Soyadi = p.Soyadi,
            Email = p.Email,
            Pozisyon_Kodu = p.Pozisyon_Kodu,
            Pozisyon_Aciklamasi = p.Pozisyon_Aciklamasi,
            Ust_Pozisyon_Kodu = p.Ust_Pozisyon_Kodu,
            Departman_Kodu = p.Departman_Kodu,
            Departman_Adi = p.Departman_Adi,
            IsActive = p.IsActive,
            LastSyncDate = p.LastSyncDate,
            LinkedUserFullName = p.LinkedUserId.HasValue && userDict.TryGetValue(p.LinkedUserId.Value, out var n) ? n : null
        }).ToList();

        return new PagedResult<QdmsPersonelDto>(dtos, request.Page, request.PageSize, total);
    }
}
