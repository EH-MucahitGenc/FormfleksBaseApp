using FormfleksBaseApp.Application.Common.Models;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IPdfGeneratorService
{
    Task<EmailAttachment> GenerateFormPdfAsync(Guid formRequestId, CancellationToken cancellationToken = default);
}
