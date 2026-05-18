using System;
using System.Collections.Generic;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AppNotifications.Queries.GetMyNotifications;

public record NotificationDto
{
    public Guid Id { get; init; }
    public string Title { get; init; } = default!;
    public string Message { get; init; } = default!;
    public string? ActionUrl { get; init; }
    public Guid? ReferenceId { get; init; }
    public bool IsRead { get; init; }
    public DateTime CreatedAt { get; init; }
}

public record GetMyNotificationsQuery(Guid UserId) : IRequest<List<NotificationDto>>
{
    public int Limit { get; init; } = 20;
}
