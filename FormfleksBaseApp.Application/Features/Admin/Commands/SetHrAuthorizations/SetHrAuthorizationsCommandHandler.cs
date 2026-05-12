using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.Admin;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Admin.Commands.SetHrAuthorizations;

/// <summary>
/// İK çalışanını günceller.
/// Eğer kullanıcının bağlı olduğu lokasyon değişirse, kullanıcının görebileceği onay kayıtları
/// ve alacağı bildirimler yeni lokasyon bilgisine göre (görünürlük kurgusu tarafından) anında yeniden değerlendirilir.
/// İK müdürü rolündeki kullanıcılar lokasyon bağımsız çalıştığı için (IsGlobalManager = true) bu kısıtlamadan etkilenmez.
/// İşlem sırasında eski yetkiler fiziksel olarak silinmez, geçmiş audit ve raporların bozulmaması için pasife (Active = false) alınır.
/// </summary>
public class SetHrAuthorizationsCommandHandler : IRequestHandler<SetHrAuthorizationsCommand, bool>
{
    private readonly IDynamicFormsDbContext _db;

    public SetHrAuthorizationsCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<bool> Handle(SetHrAuthorizationsCommand request, CancellationToken ct)
    {
        // 1. Kullanıcının mevcut tüm aktif yetkilerini bul ve soft-delete (pasife alma) yap.
        var existingAuths = await _db.HrAuthorizations
            .Where(x => x.UserId == request.UserId && x.Active)
            .ToListAsync(ct);

        foreach (var auth in existingAuths)
        {
            auth.Active = false;
            auth.UpdatedAt = DateTime.UtcNow;
        }

        // 2. Yeni yetkileri ekle
        if (request.IsGlobalManager)
        {
            // Global manager ise lokasyona gerek yoktur, tek bir global kayıt atılır.
            _db.HrAuthorizations.Add(new HrAuthorization
            {
                UserId = request.UserId,
                IsGlobalManager = true,
                LocationName = null,
                CreatedAt = DateTime.UtcNow,
                Active = true
            });
        }
        else
        {
            // Lokasyon bazlı ise, her bir lokasyon için ayrı bir satır atılır.
            foreach (var loc in request.Locations.Distinct())
            {
                if (string.IsNullOrWhiteSpace(loc)) continue;

                _db.HrAuthorizations.Add(new HrAuthorization
                {
                    UserId = request.UserId,
                    IsGlobalManager = false,
                    LocationName = loc.Trim(),
                    CreatedAt = DateTime.UtcNow,
                    Active = true
                });
            }
        }

        await _db.SaveChangesAsync(ct);
        return true;
    }
}
