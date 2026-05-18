using System;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AppNotifications.Commands.MarkNotificationAsRead;

public record MarkNotificationAsReadCommand(Guid NotificationId, Guid UserId) : IRequest<bool>;
