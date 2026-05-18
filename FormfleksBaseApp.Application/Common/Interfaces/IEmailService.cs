using FormfleksBaseApp.Application.Common.Models;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IEmailService
{
    /// <summary>
    /// Form onaya sunulduğunda veya yeni bir yöneticiye düştüğünde gönderilen bildirim maili.
    /// Opsiyonel olan "token" parametresi dolu gelirse, mailin içerisine sisteme giriş yapmadan formun
    /// onaylanmasını, reddedilmesini veya iade edilmesini sağlayan Magic Link (Hızlı Aksiyon) butonları eklenir.
    /// </summary>
    Task SendApprovalRequestEmailAsync(string toEmail, string assigneeName, string formRequestNo, Guid formRequestId, string formTypeName, string requesterName, string requesterCompany, List<EmailAttachment>? attachments = null, string? token = null, CancellationToken cancellationToken = default);
    Task SendApprovalCompletedEmailAsync(string toEmail, string requesterName, string formRequestNo, Guid formRequestId, string formTypeName, bool isApproved, string requesterCompany, List<EmailAttachment>? attachments = null, CancellationToken cancellationToken = default);
    Task SendApprovalReturnedEmailAsync(string toEmail, string requesterName, string formRequestNo, Guid formRequestId, string formTypeName, string requesterCompany, List<EmailAttachment>? attachments = null, CancellationToken cancellationToken = default);
    Task QueueEmailAsync(EmailMessage message, CancellationToken cancellationToken = default);
}
