using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Common.Models;

using Microsoft.Extensions.Configuration;

namespace FormfleksBaseApp.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IEmailBackgroundQueue _emailQueue;
    private readonly IConfiguration _config;
    private const string BaseHtmlTemplate = """
    <!DOCTYPE html>
    <html lang="tr">
    <head>
        <meta charset="UTF-8">
        <meta name="viewport" content="width=device-width, initial-scale=1.0">
        <style>
            /* Reset */
            body, p, h1, h2, h3, h4, h5, h6 { margin: 0; padding: 0; }
            body { font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; background-color: #f3f4f6; color: #1f2937; -webkit-font-smoothing: antialiased; }
            table { border-collapse: collapse; width: 100%; }
            a { text-decoration: none; }
            
            /* Layout */
            .wrapper { width: 100%; table-layout: fixed; background-color: #f3f4f6; padding: 50px 0; }
            .main { max-width: 600px; margin: 0 auto; background-color: #ffffff; border-radius: 12px; overflow: hidden; box-shadow: 0 4px 6px -1px rgba(0, 0, 0, 0.1), 0 2px 4px -1px rgba(0, 0, 0, 0.06); border-top: 6px solid #f59e0b; }
            
            /* Content */
            .content { padding: 45px 40px; }
            .greeting { font-size: 22px; font-weight: 700; color: #111827; margin-bottom: 20px; }
            .message { font-size: 16px; line-height: 1.6; color: #4b5563; margin-bottom: 35px; }
            
            /* Detail Card */
            .detail-card { background-color: #f8fafc; border: 1px solid #e2e8f0; border-radius: 8px; padding: 25px; margin-bottom: 35px; }
            .detail-row { margin-bottom: 18px; }
            .detail-row:last-child { margin-bottom: 0; }
            .detail-label { font-size: 12px; font-weight: 700; color: #64748b; text-transform: uppercase; letter-spacing: 0.8px; display: block; margin-bottom: 6px; }
            .detail-value { font-size: 16px; font-weight: 600; color: #0f172a; }
            
            /* Action */
            .action-wrapper { text-align: center; margin: 40px 0 10px 0; }
            .btn { display: inline-block; background-color: #f59e0b; color: #ffffff; font-size: 16px; font-weight: 600; padding: 14px 32px; border-radius: 8px; transition: background-color 0.2s; box-shadow: 0 4px 6px rgba(245, 158, 11, 0.2); }
            .btn:hover { background-color: #d97706; }
            
            /* Badges */
            .badge-container { margin-bottom: 25px; }
            .badge { display: inline-block; padding: 8px 16px; border-radius: 6px; font-size: 14px; font-weight: 600; letter-spacing: 0.3px; }
            .badge-warning { background-color: #fffbeb; color: #b45309; border: 1px solid #fde68a; }
            .badge-success { background-color: #ecfdf5; color: #166534; border: 1px solid #bbf7d0; }
            .badge-danger { background-color: #fef2f2; color: #991b1b; border: 1px solid #fecaca; }

            /* Footer */
            .footer { background-color: #f1f5f9; padding: 30px; text-align: center; border-bottom-left-radius: 12px; border-bottom-right-radius: 12px; }
            .footer p { font-size: 13px; color: #64748b; margin-bottom: 8px; line-height: 1.5; }
            .footer strong { color: #475569; }
        </style>
    </head>
    <body>
        <div class="wrapper">
            <div class="main">
                <div class="content">
                    {{StatusBadge}}
                    
                    <h2 class="greeting">Sayın {{RecipientName}},</h2>
                    <p class="message">{{PrimaryMessage}}</p>
                    
                    <div class="detail-card">
                        <div class="detail-row">
                            <span class="detail-label">Talep Eden</span>
                            <span class="detail-value">{{RequesterName}}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Form Tipi</span>
                            <span class="detail-value">{{FormTypeName}}</span>
                        </div>
                        <div class="detail-row">
                            <span class="detail-label">Sistem Kayıt No</span>
                            <span class="detail-value">{{FormRequestNo}}</span>
                        </div>
                    </div>
                    
                    {{ActionSection}}
                </div>
                <div class="footer">
                    <p>Bu güvenli e-posta <strong>Erkurt Holding Formfleks İş Akış Sistemi</strong> tarafından otomatik olarak gönderilmiştir. Lütfen doğrudan yanıtlamayınız.</p>
                    <p>&copy; 2026 Erkurt Holding Formfleks. Tüm Hakları Saklıdır.</p>
                </div>
            </div>
        </div>
    </body>
    </html>
    """;

    public EmailService(IEmailBackgroundQueue emailQueue, IConfiguration config)
    {
        _emailQueue = emailQueue;
        _config = config;
    }

    public async Task SendApprovalRequestEmailAsync(string toEmail, string assigneeName, string formRequestNo, string formTypeName, string requesterName, CancellationToken cancellationToken = default)
    {
        var subject = $"[Onay Bekleniyor] {formRequestNo} - {formTypeName}";
        
        var messageBase = $"Yeni bir form değerlendirmeniz için tarafınıza atanmıştır. Form detaylarını inceleyip en kısa sürede onay veya red işlemini gerçekleştirmeniz gerekmektedir.";
        
        var baseUrl = _config["FrontendBaseUrl"] ?? "http://localhost:3000";
        var actionUrl = $"{baseUrl.TrimEnd('/')}/forms/{formRequestNo}";
        var actionSection = $"<div class=\"action-wrapper\"><a href=\"{actionUrl}\" class=\"btn\">Dosyayı Görüntüle ve İşlem Yap &rarr;</a></div>";
        var statusBadge = "<div class=\"badge-container\"><span class=\"badge badge-warning\">⏳ Onay Bekliyor</span></div>";

        var htmlBody = BaseHtmlTemplate
            .Replace("{{StatusBadge}}", statusBadge)
            .Replace("{{RecipientName}}", assigneeName)
            .Replace("{{PrimaryMessage}}", messageBase)
            .Replace("{{RequesterName}}", requesterName)
            .Replace("{{FormRequestNo}}", formRequestNo)
            .Replace("{{FormTypeName}}", formTypeName)
            .Replace("{{ActionSection}}", actionSection);

        var msg = new EmailMessage
        {
            ToAddresses = new List<string> { toEmail },
            Subject = subject,
            HtmlBody = htmlBody
        };

        await QueueEmailAsync(msg, cancellationToken);
    }

    public async Task SendApprovalCompletedEmailAsync(string toEmail, string requesterName, string formRequestNo, string formTypeName, bool isApproved, CancellationToken cancellationToken = default)
    {
        var durumMetni = isApproved ? "Onaylandı" : "Reddedildi";
        var subject = $"[Durum: {durumMetni}] {formRequestNo} - {formTypeName}";
        
        var messageBase = isApproved 
            ? "Talebiniz tüm onay yöneticileri tarafından incelenmiş ve <strong>Onaylanmıştır</strong>. Süreç başarıyla tamamlanmıştır." 
            : "Talebiniz bir yönetici tarafından incelenmiş ve <strong>Reddedilmiştir</strong>. Süreç sonlandırıldı.";

        var baseUrl = _config["FrontendBaseUrl"] ?? "http://localhost:3000";
        var actionUrl = $"{baseUrl.TrimEnd('/')}/forms/{formRequestNo}";
        var actionSection = $"<div class=\"action-wrapper\"><a href=\"{actionUrl}\" class=\"btn\">Sistem Üzerinde Görüntüle &rarr;</a></div>";
        
        var statusBadge = isApproved 
            ? "<div class=\"badge-container\"><span class=\"badge badge-success\">✅ Onaylandı</span></div>"
            : "<div class=\"badge-container\"><span class=\"badge badge-danger\">❌ Reddedildi</span></div>";

        var htmlBody = BaseHtmlTemplate
            .Replace("{{StatusBadge}}", statusBadge)
            .Replace("{{RecipientName}}", requesterName) // Talep eden kişiye gidiyor
            .Replace("{{PrimaryMessage}}", messageBase)
            .Replace("{{RequesterName}}", requesterName)
            .Replace("{{FormRequestNo}}", formRequestNo)
            .Replace("{{FormTypeName}}", formTypeName)
            .Replace("{{ActionSection}}", actionSection);

        var msg = new EmailMessage
        {
            ToAddresses = new List<string> { toEmail },
            Subject = subject,
            HtmlBody = htmlBody
        };

        await QueueEmailAsync(msg, cancellationToken);
    }

    public async Task QueueEmailAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        await _emailQueue.QueueEmailAsync(message, cancellationToken);
    }
}
