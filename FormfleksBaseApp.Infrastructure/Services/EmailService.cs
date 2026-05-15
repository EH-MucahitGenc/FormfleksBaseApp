using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Common.Models;
using Microsoft.Extensions.Configuration;

namespace FormfleksBaseApp.Infrastructure.Services;

public class EmailService : IEmailService
{
    private readonly IEmailBackgroundQueue _emailQueue;
    private readonly IConfiguration _config;

    // ──────────────────────────────────────────────────────────────────────────
    // CORE BUILDER — Tüm mailler bu fonksiyondan üretilir.
    // Email-client safe: sadece solid renkler, table layout, inline styles.
    // ──────────────────────────────────────────────────────────────────────────
    private static string BuildEmail(
        string accentColor,          // Üst şerit ve buton rengi (#16a34a gibi)
        string accentDark,           // Daha koyu ton (hero daire arka planı)
        string accentTextColor,      // Üst şerit yazı rengi (genelde #fff)
        string accentLabel,          // "ONAYLANDI" gibi kısa durum metni (UPPERCASE)
        string statusIcon,           // Büyük ikon (hero dairesindeki)
        string recipientName,
        string subject,
        string bodyHtml,             // Ana gövde HTML içeriği (custom per-type)
        string formRequestNo,
        string formTypeName,
        string requesterName,
        string actionUrl,
        string actionLabel,
        string actionBgColor,
        string baseUrl,
        string requesterCompany,
        string actionTextColor = "#ffffff")
    {
        bool isErkurt = requesterCompany.Contains("Erkurt", StringComparison.OrdinalIgnoreCase);
        string logoFile = isErkurt ? "erkurtlogo.png" : "logo.png";
        string logoAlt = isErkurt ? "Erkurt Holding" : "Formfleks";
        string brandName = isErkurt ? "Erkurt Holding" : "Formfleks";
        string brandCode = isErkurt ? "EH" : "FF";
        string platformLabel = isErkurt ? "ERKURT HOLDİNG" : "FORMFLEKS";

        // accentLabel'dan alıcı rolünü türet (yeni parametre eklenmeden)
        string recipientRole = accentLabel switch
        {
            "ONAY BEKLENİYOR" => "Onay Yöneticisi",
            "REVİZYON GEREKİYOR" => "Talep Eden",
            _ => "Talep Eden"   // ONAYLANDI, REDDEDİLDİ
        };

        // Alıcı baş harfleri (avatar için)
        string initials = recipientName.Split(' ', StringSplitOptions.RemoveEmptyEntries) is { Length: > 0 } parts
            ? string.Concat(parts.Take(2).Select(p => p[0]))
            : recipientName[..1];

        string accentLabelTitleCase = string.Join(" ", accentLabel.Split(' ').Select(w => w.Length > 0 ? char.ToUpper(w[0]) + w.Substring(1).ToLower() : ""));

        return $$"""
        <!DOCTYPE html>
        <html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width,initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>{{brandName}} — {{subject}}</title>
        </head>
        <body style="margin:0;padding:0;background-color:#eef2f6;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="background-color:#eef2f6;padding:40px 16px;">
            <tr><td align="center">
              <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;border-radius:12px;overflow:hidden;background-color:#ffffff;box-shadow:0 10px 25px rgba(0,0,0,0.05);">
                
                <!-- HEADER -->
                <tr>
                  <td style="background-color:{{accentColor}};padding:16px 24px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                      <tr>
                        <td valign="middle" style="width:120px;">
                          <img src="{{baseUrl}}/{{logoFile}}" alt="{{logoAlt}}" style="max-height:24px;display:block;border-radius:4px;" />
                        </td>
                        <td valign="middle" style="padding-left:12px;">
                          <span style="font-size:11px;font-weight:700;color:#ffffff;letter-spacing:0.5px;text-transform:uppercase;">KURUMSAL FORM VE ONAY PLATFORMU</span>
                        </td>
                        <td align="right" valign="middle">
                          <table cellpadding="0" cellspacing="0" border="0" role="presentation" align="right">
                            <tr>
                              <td style="background-color:rgba(0,0,0,0.2);border-radius:20px;padding:6px 14px;">
                                <span style="font-size:11px;font-weight:800;color:#ffffff;letter-spacing:0.5px;white-space:nowrap;">{{statusIcon}} {{accentLabel}}</span>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- HERO -->
                <tr>
                  <td style="background-color:#0f172a;padding:40px 20px;text-align:center;">
                    <div style="font-size:48px;line-height:1;margin-bottom:16px;">{{statusIcon}}</div>
                    <h1 style="margin:0 0 8px;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-0.5px;">{{statusIcon}} {{accentLabelTitleCase}}</h1>
                    <p style="margin:0;font-size:12px;color:#94a3b8;letter-spacing:0.5px;text-transform:uppercase;">{{platformLabel}} Kurumsal Form ve Onay Platformu</p>
                  </td>
                </tr>

                <!-- CONTENT -->
                <tr>
                  <td style="padding:40px 36px 20px;">
                    <p style="margin:0 0 4px;font-size:11px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">SAYIN,</p>
                    <h2 style="margin:0 0 24px;font-size:24px;font-weight:900;color:#0f172a;">{{recipientName}}</h2>
                    
                    <div style="font-size:15px;line-height:1.8;color:#475569;">
                      {{bodyHtml}}
                    </div>
                  </td>
                </tr>

                <!-- TALEP BİLGİLERİ CARD -->
                <tr>
                  <td style="padding:0 36px 36px;">
                    <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="border:1px solid #e2e8f0;border-radius:8px;overflow:hidden;">
                      <tr>
                        <td style="background-color:{{accentColor}};padding:12px 16px;">
                          <span style="font-size:12px;font-weight:800;color:#ffffff;letter-spacing:1px;text-transform:uppercase;">📋 TALEP BİLGİLERİ</span>
                        </td>
                      </tr>
                      <tr>
                        <td style="background-color:#f8fafc;padding:20px;">
                          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                            <tr>
                              <td width="50%" style="padding-bottom:16px;vertical-align:top;">
                                <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">KAYIT NO</div>
                                <div style="font-size:14px;font-weight:900;color:#0f172a;">{{formRequestNo}}</div>
                              </td>
                              <td width="50%" style="padding-bottom:16px;vertical-align:top;">
                                <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">TALEP EDEN</div>
                                <div style="font-size:14px;font-weight:900;color:#0f172a;">{{requesterName}}</div>
                              </td>
                            </tr>
                            <tr>
                              <td colspan="2" style="border-top:1px solid #e2e8f0;padding-top:16px;">
                                <div style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;margin-bottom:4px;">FORM TİPİ</div>
                                <div style="font-size:14px;font-weight:900;color:#0f172a;">{{formTypeName}}</div>
                              </td>
                            </tr>
                          </table>
                        </td>
                      </tr>
                    </table>
                  </td>
                </tr>

                <!-- CTA BUTTON -->
                <tr>
                  <td style="padding:0 36px 40px;text-align:center;">
                    <a href="{{actionUrl}}" style="display:inline-block;background-color:{{accentColor}};color:#ffffff;font-size:14px;font-weight:800;text-decoration:none;padding:16px 36px;border-radius:30px;letter-spacing:0.5px;">
                      {{actionLabel}} &rarr;
                    </a>
                    <p style="margin:20px 0 0;font-size:11px;color:#94a3b8;">
                      Buton çalışmıyorsa: <br/><a href="{{actionUrl}}" style="color:#3b82f6;text-decoration:underline;line-height:2;">{{actionUrl}}</a>
                    </p>
                  </td>
                </tr>

              </table>
              
              <!-- FOOTER OUTSIDE CARD -->
              <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation" style="max-width:600px;width:100%;margin-top:20px;">
                <tr>
                  <td style="text-align:center;">
                    <p style="margin:0 0 8px;font-size:12px;font-weight:700;color:#64748b;">{{brandName}} Kurumsal Form ve Onay Platformu</p>
                    <p style="margin:0;font-size:11px;color:#94a3b8;">Bu e-posta otomatik olarak gönderilmiştir. Lütfen doğrudan yanıt vermeyiniz.</p>
                    <p style="margin:16px 0 0;font-size:10px;color:#64748b;">Powered by <span style="font-weight:800;color:{{accentColor}};">FORMFLEKS YAZILIM</span> &copy; 2026</p>
                  </td>
                </tr>
              </table>

            </td></tr>
          </table>
        </body>
        </html>
        """;
    }


    public EmailService(IEmailBackgroundQueue emailQueue, IConfiguration config)
    {
        _emailQueue = emailQueue;
        _config = config;
    }


    private string GetBaseUrl() => (_config["FrontendBaseUrl"] ?? "http://localhost:3001").TrimEnd('/');

    // ══════════════════════════════════════════════════════════════════════════
    // 1. ONAY BEKLİYOR — Atanan yöneticiye (Amber/Gold tema)
    // ══════════════════════════════════════════════════════════════════════════
    public async Task SendApprovalRequestEmailAsync(
        string toEmail, string assigneeName, string formRequestNo,
        Guid formRequestId, string formTypeName, string requesterName, string requesterCompany,
        CancellationToken cancellationToken = default)
    {
        var actionUrl = $"{GetBaseUrl()}/forms/{formRequestId}";

        var body = $"""
            <p>
              <strong style="color:#92400e;">{requesterName}</strong> tarafından oluşturulan
              <strong style="color:#92400e;">{formTypeName}</strong> formu değerlendirmenizi bekliyor.
            </p>
            <p style="margin-top:16px;">
              Form detaylarını inceleyip en kısa sürede <strong>onay veya ret</strong> işlemini
              gerçekleştirmenizi rica ederiz.
            </p>
            """;

        var html = BuildEmail(
            accentColor: "#b45309",
            accentDark: "#78350f",
            accentTextColor: "#ffffff",
            accentLabel: "ONAY BEKLENİYOR",
            statusIcon: "⏳",
            recipientName: assigneeName,
            subject: $"Onay İsteği: {formRequestNo}",
            bodyHtml: body,
            formRequestNo: formRequestNo,
            formTypeName: formTypeName,
            requesterName: requesterName,
            actionUrl: actionUrl,
            actionLabel: "Formu İncele ve İşlem Yap",
            actionBgColor: "#b45309",
            baseUrl: GetBaseUrl(),
            requesterCompany: requesterCompany);

        await QueueEmailAsync(new EmailMessage
        {
            ToAddresses = new List<string> { toEmail },
            Subject = $"⏳ Onay İsteği: {formRequestNo} — {formTypeName}",
            HtmlBody = html
        }, cancellationToken);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 2. ONAYLANDI / REDDEDİLDİ — Talep eden kişiye
    // ══════════════════════════════════════════════════════════════════════════
    public async Task SendApprovalCompletedEmailAsync(
        string toEmail, string requesterName, string formRequestNo,
        Guid formRequestId, string formTypeName, bool isApproved, string requesterCompany,
        CancellationToken cancellationToken = default)
    {
        var actionUrl = $"{GetBaseUrl()}/forms/{formRequestId}";

        string accentColor, accentDark, accentLabel, statusIcon, bodyHtml, emailSubject, actionLabel;

        if (isApproved)
        {
            accentColor = "#15803d";
            accentDark = "#14532d";
            accentLabel = "ONAYLANDI";
            statusIcon = "✅";
            emailSubject = $"✅ Talebiniz Onaylandı: {formRequestNo}";
            actionLabel = "Onay Sonucunu Görüntüle";
            bodyHtml = $"""
                <p>
                  Harika haber! <strong style="color:#15803d;">{formTypeName}</strong> formunuz
                  tüm onay aşamalarından başarıyla geçmiş ve
                  <strong style="color:#15803d;">onaylanmıştır</strong>.
                </p>
                <p style="margin-top:16px;">
                  Süreç başarıyla tamamlanmıştır. Detayları sistem üzerinden inceleyebilirsiniz.
                </p>
                """;
        }
        else
        {
            accentColor = "#b91c1c";
            accentDark = "#7f1d1d";
            accentLabel = "REDDEDİLDİ";
            statusIcon = "❌";
            emailSubject = $"❌ Talebiniz Reddedildi: {formRequestNo}";
            actionLabel = "Formu ve Açıklamayı Görüntüle";
            bodyHtml = $"""
                <p>
                  <strong style="color:#b91c1c;">{formTypeName}</strong> formunuz bir onay yöneticisi
                  tarafından incelenmiş ve <strong style="color:#b91c1c;">reddedilmiştir</strong>.
                </p>
                <p style="margin-top:16px;">
                  Ret gerekçesini ve detayları sistem üzerinden görüntüleyebilirsiniz.
                </p>
                """;
        }

        var html = BuildEmail(
            accentColor: accentColor,
            accentDark: accentDark,
            accentTextColor: "#ffffff",
            accentLabel: accentLabel,
            statusIcon: statusIcon,
            recipientName: requesterName,
            subject: emailSubject,
            bodyHtml: bodyHtml,
            formRequestNo: formRequestNo,
            formTypeName: formTypeName,
            requesterName: requesterName,
            actionUrl: actionUrl,
            actionLabel: actionLabel,
            actionBgColor: accentColor,
            baseUrl: GetBaseUrl(),
            requesterCompany: requesterCompany);

        await QueueEmailAsync(new EmailMessage
        {
            ToAddresses = new List<string> { toEmail },
            Subject = emailSubject,
            HtmlBody = html
        }, cancellationToken);
    }

    // ══════════════════════════════════════════════════════════════════════════
    // 3. İADE EDİLDİ (Revizyon) — Talep eden kişiye (Mavi tema)
    // ══════════════════════════════════════════════════════════════════════════
    public async Task SendApprovalReturnedEmailAsync(
        string toEmail, string requesterName, string formRequestNo,
        Guid formRequestId, string formTypeName, string requesterCompany,
        CancellationToken cancellationToken = default)
    {
        var actionUrl = $"{GetBaseUrl()}/forms/{formRequestId}";

        var bodyHtml = $"""
            <p>
              <strong style="color:#1d4ed8;">{formTypeName}</strong> formunuz bir onay yöneticisi
              tarafından incelenmiş ve düzeltme/tamamlama amacıyla tarafınıza
              <strong style="color:#1d4ed8;">iade edilmiştir</strong>.
            </p>
            <p style="margin-top:16px;">
              Lütfen gerekli güncellemeleri yaparak formu tekrar onaya gönderiniz.
              Form üzerinde düzenleme yapma hakkınız aktiftir.
            </p>
            """;

        var html = BuildEmail(
            accentColor: "#1d4ed8",
            accentDark: "#1e3a8a",
            accentTextColor: "#ffffff",
            accentLabel: "REVİZYON GEREKİYOR",
            statusIcon: "🔄",
            recipientName: requesterName,
            subject: $"Revizyon Talebi: {formRequestNo}",
            bodyHtml: bodyHtml,
            formRequestNo: formRequestNo,
            formTypeName: formTypeName,
            requesterName: requesterName,
            actionUrl: actionUrl,
            actionLabel: "Formu Düzenle ve Tekrar Gönder",
            actionBgColor: "#1d4ed8",
            baseUrl: GetBaseUrl(),
            requesterCompany: requesterCompany);

        await QueueEmailAsync(new EmailMessage
        {
            ToAddresses = new List<string> { toEmail },
            Subject = $"🔄 Revizyon Talebi: {formRequestNo} — {formTypeName}",
            HtmlBody = html
        }, cancellationToken);
    }

    public async Task QueueEmailAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        await _emailQueue.QueueEmailAsync(message, cancellationToken);
    }
}
