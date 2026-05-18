using System;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IAppNotificationService
{
    Task SendNotificationAsync(Guid userId, string title, string message, string? actionUrl, Guid? referenceId = null, CancellationToken cancellationToken = default);
}
