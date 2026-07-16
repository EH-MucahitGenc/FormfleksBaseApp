using System;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Common.Interfaces;

/// <summary>
/// Sistem içi veya dışı bildirimlerin (Notification) kullanıcılara gönderilmesi için kullanılan servis arayüzü.
/// </summary>
public interface IAppNotificationService
{
    Task SendNotificationAsync(Guid userId, string title, string message, string? actionUrl, Guid? referenceId = null, CancellationToken cancellationToken = default);
}
