using FormfleksBaseApp.Api.Hubs;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.System;
using Microsoft.AspNetCore.SignalR;

namespace FormfleksBaseApp.Api.Services;

public class AppNotificationService : IAppNotificationService
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IHubContext<NotificationHub> _hubContext;

    public AppNotificationService(IDynamicFormsDbContext db, IHubContext<NotificationHub> hubContext)
    {
        _db = db;
        _hubContext = hubContext;
    }

    public async Task SendNotificationAsync(Guid userId, string title, string message, string? actionUrl, Guid? referenceId = null, CancellationToken cancellationToken = default)
    {
        // 1. Veritabanına kaydet
        var notification = new AppNotificationEntity
        {
            Id = Guid.NewGuid(),
            UserId = userId,
            Title = title,
            Message = message,
            ActionUrl = actionUrl,
            ReferenceId = referenceId,
            CreatedAt = DateTime.UtcNow,
            IsRead = false
        };

        _db.AppNotifications.Add(notification);
        await _db.SaveChangesAsync(cancellationToken);

        // 2. SignalR üzerinden canlı yayına gönder (Sadece ilgili kullanıcıya)
        // Not: JWT Bearer auth kullanıldığında, SignalR varsayılan olarak User Identifier'ı JWT'deki NameIdentifier'dan (UserId) alır.
        await _hubContext.Clients.User(userId.ToString()).SendAsync("ReceiveNotification", new
        {
            id = notification.Id,
            title = notification.Title,
            message = notification.Message,
            actionUrl = notification.ActionUrl,
            createdAt = notification.CreatedAt,
            isRead = notification.IsRead
        }, cancellationToken);
    }
}
