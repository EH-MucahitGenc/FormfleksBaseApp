using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Common.Models;
using Microsoft.EntityFrameworkCore;
using System.Text.RegularExpressions;

namespace FormfleksBaseApp.Infrastructure.Services;

public class FormAttachmentCollectorService : IFormAttachmentCollectorService
{
    private readonly IDynamicFormsDbContext _db;

    public FormAttachmentCollectorService(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<List<EmailAttachment>> CollectAttachmentsAsync(Guid formRequestId, CancellationToken cancellationToken = default)
    {
        var attachments = new List<EmailAttachment>();

        var request = await _db.FormRequests.FirstOrDefaultAsync(r => r.Id == formRequestId, cancellationToken);
        if (request == null) return attachments;

        // FieldType 10 = Dosya Yükleme Alanı
        var fields = await _db.FormFields
            .Where(f => f.FormTypeId == request.FormTypeId && f.Active && f.FieldType == 10)
            .ToListAsync(cancellationToken);

        if (!fields.Any()) return attachments;

        var fieldIds = fields.Select(f => f.Id).ToList();

        var values = await _db.FormRequestValues
            .Where(v => v.RequestId == formRequestId && fieldIds.Contains(v.FieldId))
            .ToListAsync(cancellationToken);

        var baseDirectory = Directory.GetCurrentDirectory();
        var uploadPath = Path.Combine(baseDirectory, "wwwroot", "uploads");

        foreach (var value in values)
        {
            var textVal = value.ValueText ?? value.ValueJson;
            if (string.IsNullOrWhiteSpace(textVal)) continue;

            // /uploads/ ile başlayan ve tırnak/virgül/boşluk ile bitmeyen kısımları Regex ile yakala
            var matches = Regex.Matches(textVal, @"/uploads/[^""',\s}]+");

            foreach (Match match in matches)
            {
                var relPath = match.Value;
                var fileName = Path.GetFileName(relPath);
                var fullPath = Path.Combine(uploadPath, fileName);
                
                if (File.Exists(fullPath))
                {
                    try
                    {
                        var bytes = await File.ReadAllBytesAsync(fullPath, cancellationToken);
                        
                        attachments.Add(new EmailAttachment
                        {
                            FileName = fileName,
                            Content = bytes,
                            ContentType = "application/octet-stream"
                        });
                    }
                    catch
                    {
                        // Okuma hatası olursa atla
                    }
                }
            }
        }

        return attachments;
    }
}
