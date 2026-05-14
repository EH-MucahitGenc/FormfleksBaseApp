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
        string accentTextColor,      // Üst şerit yazı rengi (genelde #fff)
        string accentLabel,          // "✅ ONAYLANDI" gibi kısa durum metni
        string statusIcon,           // Büyük ikon (üst şeritteki)
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
        return $$"""
        <!DOCTYPE html>
        <html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width,initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>Formfleks — {{subject}}</title>
        </head>
        <body style="margin:0;padding:0;background-color:#e8edf2;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

          <!-- OUTER TABLE -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
                 style="background-color:#e8edf2;padding:48px 16px;">
            <tr>
              <td align="center">

                <!-- CARD (600px) -->
                <table width="680" cellpadding="0" cellspacing="0" border="0" role="presentation"
                       style="max-width:680px;width:100%;background-color:#ffffff;border-radius:0 0 12px 12px;">

                  <!-- ░░░ ACCENT TOP BAR ░░░ -->
                  <tr>
                    <td style="background-color:{{accentColor}};border-radius:12px 12px 0 0;padding:28px 40px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                        <tr>
                          <td valign="middle">
                            <!-- Logo -->
                            <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                              <tr>
                                <td style="background-color:rgba(0,0,0,0.18);border-radius:8px;padding:6px 14px;">
                                  <img src="{{baseUrl}}/{{(requesterCompany.Contains("Erkurt", StringComparison.OrdinalIgnoreCase) ? "erkurtlogo.png" : "logo.png")}}" alt="{{(requesterCompany.Contains("Erkurt", StringComparison.OrdinalIgnoreCase) ? "Erkurt Holding" : "Formfleks")}}" style="max-height: 24px; display: block;" />
                                </td>
                                <td style="padding-left:12px;">
                                  <span style="font-size:11px;font-weight:600;color:{{accentTextColor}};opacity:0.8;letter-spacing:1.2px;text-transform:uppercase;">Kurumsal Form ve Onay Platformu</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                          <td align="right" valign="middle">
                            <!-- Status badge -->
                            <div style="display:inline-block;background-color:rgba(0,0,0,0.22);border-radius:50px;padding:7px 18px;">
                              <span style="font-size:13px;font-weight:700;color:#ffffff;letter-spacing:0.5px;text-transform:uppercase;white-space:nowrap;">{{accentLabel}}</span>
                            </div>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- ░░░ HERO ICON BAND ░░░ -->
                  <tr>
                    <td style="background-color:#0f172a;padding:36px 40px;" align="center">
                      <div style="font-size:56px;line-height:1;margin-bottom:16px;">{{statusIcon}}</div>
                      <h1 style="margin:0;font-size:28px;font-weight:900;color:#ffffff;letter-spacing:-1px;line-height:1.2;">{{accentLabel}}</h1>
                      <p style="margin:8px 0 0;font-size:13px;color:#94a3b8;letter-spacing:0.3px;">{{(requesterCompany.Contains("Erkurt", StringComparison.OrdinalIgnoreCase) ? "ERKURT HOLDİNG" : "FORMFLEKS")}} Kurumsal Form ve Onay Platformu</p>
                    </td>
                  </tr>

                  <!-- ░░░ CONTENT ░░░ -->
                  <tr>
                    <td style="padding:40px 40px 32px;">

                      <!-- Greeting -->
                      <p style="margin:0 0 6px;font-size:13px;font-weight:600;color:#94a3b8;letter-spacing:1px;text-transform:uppercase;">Sayın,</p>
                      <h2 style="margin:0 0 20px;font-size:24px;font-weight:800;color:#0f172a;letter-spacing:-0.5px;">{{recipientName}}</h2>

                      <!-- Body message -->
                      <div style="font-size:16px;line-height:1.75;color:#475569;margin-bottom:32px;">
                        {{bodyHtml}}
                      </div>

                      <!-- ░░░ DETAIL CARD ░░░ -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
                             style="background-color:#f8fafc;border-radius:10px;border:1px solid #e2e8f0;margin-bottom:36px;">

                        <!-- Card header bar -->
                        <tr>
                          <td colspan="2"
                              style="background-color:{{accentColor}};border-radius:10px 10px 0 0;padding:10px 22px;">
                            <span style="font-size:11px;font-weight:700;color:#ffffff;letter-spacing:1.5px;text-transform:uppercase;">
                              📋 &nbsp;Talep Bilgileri
                            </span>
                          </td>
                        </tr>

                        <!-- Row 1 -->
                        <tr>
                          <td width="50%" style="padding:20px 22px 12px;vertical-align:top;border-right:1px solid #e2e8f0;">
                            <span style="display:block;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">Kayıt No</span>
                            <span style="display:block;font-size:15px;font-weight:800;color:#0f172a;font-variant-numeric:tabular-nums;">{{formRequestNo}}</span>
                          </td>
                          <td width="50%" style="padding:20px 22px 12px;vertical-align:top;">
                            <span style="display:block;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">Talep Eden</span>
                            <span style="display:block;font-size:15px;font-weight:800;color:#0f172a;">{{requesterName}}</span>
                          </td>
                        </tr>

                        <!-- Divider -->
                        <tr>
                          <td colspan="2" style="padding:0 22px;">
                            <div style="height:1px;background-color:#e2e8f0;"></div>
                          </td>
                        </tr>

                        <!-- Row 2 -->
                        <tr>
                          <td colspan="2" style="padding:12px 22px 20px;vertical-align:top;">
                            <span style="display:block;font-size:10px;font-weight:700;color:#94a3b8;text-transform:uppercase;letter-spacing:1px;margin-bottom:5px;">Form Tipi</span>
                            <span style="display:block;font-size:15px;font-weight:800;color:#0f172a;">{{formTypeName}}</span>
                          </td>
                        </tr>

                      </table>

                      <!-- ░░░ CTA BUTTON ░░░ -->
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                        <tr>
                          <td align="center" style="padding:4px 0 16px;">
                            <a href="{{actionUrl}}"
                               style="display:inline-block;background-color:{{actionBgColor}};color:{{actionTextColor}};font-size:15px;font-weight:700;text-decoration:none;padding:16px 44px;border-radius:50px;letter-spacing:0.3px;">
                              {{actionLabel}} &nbsp;→
                            </a>
                          </td>
                        </tr>
                      </table>

                      <!-- URL fallback -->
                      <p style="text-align:center;font-size:12px;color:#94a3b8;margin:8px 0 0;word-break:break-all;">
                        Buton çalışmıyorsa: <a href="{{actionUrl}}" style="color:#3b82f6;">{{actionUrl}}</a>
                      </p>

                    </td>
                  </tr>

                  <!-- ░░░ FOOTER ░░░ -->
                  <tr>
                    <td style="background-color:#0f172a;border-radius:0 0 12px 12px;padding:24px 40px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                        <tr>
                          <td valign="middle">
                            <p style="margin:0 0 4px;font-size:12px;font-weight:600;color:#94a3b8;">
                              {{(requesterCompany.Contains("Erkurt", StringComparison.OrdinalIgnoreCase) ? "Erkurt Holding" : "Formfleks")}} &mdash; Kurumsal Form ve Onay Platformu
                            </p>
                            <p style="margin:0;font-size:11px;color:#475569;">Bu e-posta otomatik gönderilmiştir. Lütfen doğrudan yanıtlamayınız.</p>
                          </td>
                          <td align="right" valign="middle">
                            <div style="background-color:rgba(255,255,255,0.06);border-radius:8px;padding:8px 14px;display:inline-block;">
                              <span style="font-size:16px;font-weight:900;color:#475569;letter-spacing:-0.5px;">{{(requesterCompany.Contains("Erkurt", StringComparison.OrdinalIgnoreCase) ? "EH" : "FF")}}</span>
                            </div>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top:16px;">
                            <div style="height:1px;background-color:#1e293b;"></div>
                          </td>
                        </tr>
                        <tr>
                          <td colspan="2" style="padding-top:14px;">
                            <p style="margin:0;font-size:11px;color:#334155;">&copy; 2026 {{(requesterCompany.Contains("Erkurt", StringComparison.OrdinalIgnoreCase) ? "Erkurt Holding" : "Formfleks")}}. Tüm Hakları Saklıdır.</p>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                </table>
                <!-- /CARD -->

              </td>
            </tr>
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
              <strong style="color:#0f172a;">{requesterName}</strong> tarafından oluşturulan
              <strong style="color:#0f172a;">{formTypeName}</strong> formu değerlendirmenizi bekliyor.
            </p>
            <p style="margin-top:16px;">
              Form detaylarını inceleyip en kısa sürede <strong>onay veya ret</strong> işlemini gerçekleştirmenizi rica ederiz.
            </p>
            """;

        var html = BuildEmail(
            accentColor:     "#b45309",
            accentTextColor: "#ffffff",
            accentLabel:     "⏳ Onay Bekleniyor",
            statusIcon:      "⏳",
            recipientName:   assigneeName,
            subject:         $"Onay İsteği: {formRequestNo}",
            bodyHtml:        body,
            formRequestNo:   formRequestNo,
            formTypeName:    formTypeName,
            requesterName:   requesterName,
            actionUrl:       actionUrl,
            actionLabel:     "Formu İncele ve İşlem Yap",
            actionBgColor:   "#b45309",
            baseUrl:         GetBaseUrl(),
            requesterCompany: requesterCompany);

        await QueueEmailAsync(new EmailMessage
        {
            ToAddresses = new List<string> { toEmail },
            Subject     = $"⏳ Onay İsteği: {formRequestNo} — {formTypeName}",
            HtmlBody    = html
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

        string accentColor, accentLabel, statusIcon, bodyHtml, emailSubject, actionLabel;

        if (isApproved)
        {
            accentColor  = "#15803d";
            accentLabel  = "✅ Onaylandı";
            statusIcon   = "✅";
            emailSubject = $"✅ Talebiniz Onaylandı: {formRequestNo}";
            actionLabel  = "Onay Sonucunu Görüntüle";
            bodyHtml = $"""
                <p>
                  Harika haber! <strong style="color:#15803d;">{formTypeName}</strong> formunuz
                  tüm onay aşamalarından başarıyla geçmiş ve <strong style="color:#15803d;">onaylanmıştır</strong>.
                </p>
                <p style="margin-top:16px;">
                  Süreç başarıyla tamamlanmıştır. Detayları sistem üzerinden inceleyebilirsiniz.
                </p>
                """;
        }
        else
        {
            accentColor  = "#b91c1c";
            accentLabel  = "❌ Reddedildi";
            statusIcon   = "❌";
            emailSubject = $"❌ Talebiniz Reddedildi: {formRequestNo}";
            actionLabel  = "Formu ve Açıklamayı Görüntüle";
            bodyHtml = $"""
                <p>
                  <strong style="color:#b91c1c;">{formTypeName}</strong> formunuz bir onay yöneticisi tarafından
                  incelenmiş ve <strong style="color:#b91c1c;">reddedilmiştir</strong>.
                </p>
                <p style="margin-top:16px;">
                  Ret gerekçesini ve detayları sistem üzerinden görüntüleyebilirsiniz.
                </p>
                """;
        }

        var html = BuildEmail(
            accentColor:     accentColor,
            accentTextColor: "#ffffff",
            accentLabel:     accentLabel,
            statusIcon:      statusIcon,
            recipientName:   requesterName,
            subject:         emailSubject,
            bodyHtml:        bodyHtml,
            formRequestNo:   formRequestNo,
            formTypeName:    formTypeName,
            requesterName:   requesterName,
            actionUrl:       actionUrl,
            actionLabel:     actionLabel,
            actionBgColor:   accentColor,
            baseUrl:         GetBaseUrl(),
            requesterCompany: requesterCompany);

        await QueueEmailAsync(new EmailMessage
        {
            ToAddresses = new List<string> { toEmail },
            Subject     = emailSubject,
            HtmlBody    = html
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
              <strong style="color:#1d4ed8;">{formTypeName}</strong> formunuz bir onay yöneticisi tarafından incelenmiş ve
              düzeltme/tamamlama amacıyla tarafınıza <strong style="color:#1d4ed8;">iade edilmiştir</strong>.
            </p>
            <p style="margin-top:16px;">
              Lütfen gerekli güncellemeleri yaparak formu tekrar onaya gönderiniz.
              Form üzerinde düzenleme yapma hakkınız aktiftir.
            </p>
            """;

        var html = BuildEmail(
            accentColor:     "#1d4ed8",
            accentTextColor: "#ffffff",
            accentLabel:     "🔄 Revizyon Gerekiyor",
            statusIcon:      "🔄",
            recipientName:   requesterName,
            subject:         $"Revizyon Talebi: {formRequestNo}",
            bodyHtml:        bodyHtml,
            formRequestNo:   formRequestNo,
            formTypeName:    formTypeName,
            requesterName:   requesterName,
            actionUrl:       actionUrl,
            actionLabel:     "Formu Düzenle ve Tekrar Gönder",
            actionBgColor:   "#1d4ed8",
            baseUrl:         GetBaseUrl(),
            requesterCompany: requesterCompany);

        await QueueEmailAsync(new EmailMessage
        {
            ToAddresses = new List<string> { toEmail },
            Subject     = $"🔄 Revizyon Talebi: {formRequestNo} — {formTypeName}",
            HtmlBody    = html
        }, cancellationToken);
    }

    public async Task QueueEmailAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        await _emailQueue.QueueEmailAsync(message, cancellationToken);
    }
}
