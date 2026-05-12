using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Admin.Commands.DeleteHrAuthorization;

/// <summary>
/// İK çalışanını veya müdürünü sistemden fiziksel olarak silmek yerine pasife alır.
/// Bu yaklaşım geçmiş onay kayıtlarının, audit bilgilerinin ve raporlama süreçlerinin bozulmaması için tercih edilmiştir.
/// Pasife alınan kullanıcı yeni onay ve bildirim süreçlerine (görünürlük kurgusu dahilinde) dahil edilmez.
/// </summary>
public class DeleteHrAuthorizationCommandHandler : IRequestHandler<DeleteHrAuthorizationCommand, bool>
{
    private readonly IDynamicFormsDbContext _db;

    public DeleteHrAuthorizationCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<bool> Handle(DeleteHrAuthorizationCommand request, CancellationToken ct)
    {
        var existingAuths = await _db.HrAuthorizations
            .Where(x => x.UserId == request.UserId && x.Active)
            .ToListAsync(ct);

        if (!existingAuths.Any()) return false;

        foreach (var auth in existingAuths)
        {
            auth.Active = false;
            auth.UpdatedAt = DateTime.UtcNow;
        }

        await _db.SaveChangesAsync(ct);
        return true;
    }
}
