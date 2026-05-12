using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Auth.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetHrAuthorizations;

/// <summary>
/// Sistemdeki mevcut İK yetkilendirme (HrAuthorization) kayıtlarını getirir.
/// Kullanıcı isimlerini (Name/Email) veritabanındaki kullanıcı havuzundan doldurarak döner.
/// Yönetim panelindeki yetkilendirme listesini beslemek için kullanılır.
/// </summary>
public class GetHrAuthorizationsQueryHandler : IRequestHandler<GetHrAuthorizationsQuery, List<HrAuthorizationDto>>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IUserRepository _userRepository;

    public GetHrAuthorizationsQueryHandler(IDynamicFormsDbContext db, IUserRepository userRepository)
    {
        _db = db;
        _userRepository = userRepository;
    }

    public async Task<List<HrAuthorizationDto>> Handle(GetHrAuthorizationsQuery request, CancellationToken ct)
    {
        var auths = await _db.HrAuthorizations
            .AsNoTracking()
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(ct);

        var userIds = auths.Select(x => x.UserId).Distinct().ToList();
        
        var userDict = new Dictionary<System.Guid, (string Name, string Email)>();
        foreach (var uid in userIds)
        {
            var user = await _userRepository.GetByIdAsync(uid, ct, false);
            if (user != null)
            {
                userDict[uid] = (user.DisplayName ?? "Bilinmeyen Kullanıcı", user.Email ?? string.Empty);
            }
        }

        var dtoList = auths.Select(x =>
        {
            var userInfo = userDict.TryGetValue(x.UserId, out var info) ? info : ("Bilinmeyen Kullanıcı", "");
            return new HrAuthorizationDto
            {
                Id = x.Id,
                UserId = x.UserId,
                UserName = userInfo.Item1,
                UserEmail = userInfo.Item2,
                IsGlobalManager = x.IsGlobalManager,
                LocationName = x.LocationName,
                Active = x.Active,
                CreatedAt = x.CreatedAt
            };
        }).ToList();

        return dtoList;
    }
}
