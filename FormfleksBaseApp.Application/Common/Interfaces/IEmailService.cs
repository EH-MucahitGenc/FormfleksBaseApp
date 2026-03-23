using FormfleksBaseApp.Application.Common.Models;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IEmailService
{
    Task SendApprovalRequestEmailAsync(string toEmail, string assigneeName, string formRequestNo, string formTypeName, string requesterName, CancellationToken cancellationToken = default);
    Task SendApprovalCompletedEmailAsync(string toEmail, string requesterName, string formRequestNo, string formTypeName, bool isApproved, CancellationToken cancellationToken = default);
    Task QueueEmailAsync(EmailMessage message, CancellationToken cancellationToken = default);
}
