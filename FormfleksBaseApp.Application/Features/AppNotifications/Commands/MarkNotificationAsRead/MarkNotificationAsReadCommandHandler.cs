using System.Threading;
using System.Threading.Tasks;

using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.AppNotifications.Commands.MarkNotificationAsRead;

public sealed class MarkNotificationAsReadCommandHandler : IRequestHandler<MarkNotificationAsReadCommand, bool>
{
    private readonly IDynamicFormsDbContext _db;

    public MarkNotificationAsReadCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<bool> Handle(MarkNotificationAsReadCommand request, CancellationToken cancellationToken)
    {
        var notif = await _db.AppNotifications
            .FirstOrDefaultAsync(n => n.Id == request.NotificationId && n.UserId == request.UserId, cancellationToken);

        if (notif == null)
            throw new BusinessException("Bildirim bulunamadı veya size ait değil.");

        if (!notif.IsRead)
        {
            notif.IsRead = true;
            await _db.SaveChangesAsync(cancellationToken);
        }

        return true;
    }
}
