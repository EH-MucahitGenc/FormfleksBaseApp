using FormfleksBaseApp.Application.Common.Models;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IFormAttachmentCollectorService
{
    Task<List<EmailAttachment>> CollectAttachmentsAsync(Guid formRequestId, CancellationToken cancellationToken = default);
}
