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

        return $$"""
        <!DOCTYPE html>
        <html lang="tr" xmlns="http://www.w3.org/1999/xhtml">
        <head>
          <meta charset="UTF-8">
          <meta name="viewport" content="width=device-width,initial-scale=1.0">
          <meta http-equiv="X-UA-Compatible" content="IE=edge">
          <title>{{brandName}} — {{subject}}</title>
        </head>
        <body style="margin:0;padding:0;background-color:#dde3ed;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,Helvetica,Arial,sans-serif;">

          <!-- OUTER TABLE -->
          <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
                 style="background-color:#dde3ed;padding:48px 16px;">
            <tr>
              <td align="center">

                <!-- CARD -->
                <table width="600" cellpadding="0" cellspacing="0" border="0" role="presentation"
                       style="max-width:600px;width:100%;border-radius:16px;overflow:hidden;border:1px solid #b8c4d4;">

                  <!-- ░░░ HEADER: sol koyu / sağ durum etiketi ░░░ -->
                  <tr>
                    <td style="background-color:#0f172a;padding:20px 28px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                        <tr>
                          <!-- Marka -->
                          <td valign="middle">
                            <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                              <tr>
                                <td style="background-color:{{accentColor}};border-radius:6px;padding:5px 11px;vertical-align:middle;">
                                  <img src="{{baseUrl}}/{{logoFile}}" alt="{{logoAlt}}" style="max-height:18px;display:block;" />
                                </td>
                                <td style="padding-left:10px;vertical-align:middle;">
                                  <span style="font-size:12px;font-weight:700;color:#94a3b8;letter-spacing:0.2px;">{{brandName}}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                          <!-- Durum etiketi -->
                          <td align="right" valign="middle">
                            <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                              <tr>
                                <td style="background-color:rgba(255,255,255,0.07);border:1px solid rgba(255,255,255,0.1);border-radius:50px;padding:5px 14px;">
                                  <span style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1.2px;text-transform:uppercase;white-space:nowrap;">
                                    {{accentLabel}}
                                  </span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>

                  <!-- ░░░ HERO: asimetrik split ░░░ -->
                  <tr>
                    <!-- Sol kolon: başlık ve rozet -->
                    <td width="58%" style="background-color:#0f172a;padding:36px 0 36px 28px;vertical-align:top;">
                      <p style="margin:0 0 14px;font-size:10px;font-weight:700;color:#475569;letter-spacing:1.8px;text-transform:uppercase;">{{recipientRole}}</p>
                      <h1 style="margin:0 0 20px;font-size:22px;font-weight:900;color:#f1f5f9;line-height:1.25;letter-spacing:-0.5px;">{{accentLabel}}</h1>
                      <table cellpadding="0" cellspacing="0" border="0" role="presentation">
                        <tr>
                          <td style="background-color:#1e293b;border-radius:6px;padding:6px 14px;">
                            <span style="font-size:11px;font-weight:700;color:{{accentColor}};letter-spacing:0.5px;">
                              {{statusIcon}} &nbsp;{{formRequestNo}}
                            </span>
                          </td>
                        </tr>
                      </table>
                    </td>
                    <!-- Sağ kolon: ikon + tarih -->
                    <td style="background-color:{{accentColor}};padding:36px 20px;vertical-align:middle;text-align:center;">
                      <div style="font-size:44px;line-height:1;margin-bottom:14px;">{{statusIcon}}</div>
                      <p style="margin:0;font-size:10px;font-weight:700;color:rgba(255,255,255,0.55);letter-spacing:1px;text-transform:uppercase;line-height:1.8;">
                        Kurumsal Form<br>&amp; Onay Platformu
                      </p>
                    </td>
                  </tr>

                  <!-- ░░░ İNCE BİLGİ ŞERİDİ ░░░ -->
                  <tr>
                    <td colspan="2" style="background-color:#f8fafc;border-top:1px solid #e2e8f0;border-bottom:1px solid #e2e8f0;padding:10px 28px;">
                      <span style="font-size:11px;font-weight:600;color:{{accentColor}};">
                        {{platformLabel}} &nbsp;·&nbsp; {{formTypeName}}
                      </span>
                    </td>
                  </tr>

                  <!-- ░░░ CONTENT ░░░ -->
                  <tr>
                    <td colspan="2" style="background-color:#ffffff;padding:32px 28px 0;">

                      <!-- Alıcı avatar + isim -->
                      <table cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin-bottom:24px;">
                        <tr>
                          <td style="width:42px;height:42px;background-color:#f1f5f9;border-radius:50%;text-align:center;vertical-align:middle;font-size:14px;font-weight:800;color:{{accentColor}};line-height:42px;">
                            {{initials}}
                          </td>
                          <td style="padding-left:12px;vertical-align:middle;">
                            <div style="font-size:14px;font-weight:700;color:#0f172a;">{{recipientName}}</div>
                            <div style="font-size:11px;color:#94a3b8;margin-top:2px;">{{recipientRole}} &middot; {{brandName}}</div>
                          </td>
                        </tr>
                      </table>

                      <!-- Gövde metni -->
                      <div style="font-size:15px;line-height:1.8;color:#475569;padding-bottom:28px;border-bottom:1px solid #f1f5f9;">
                        {{bodyHtml}}
                      </div>

                    </td>
                  </tr>

                  <!-- ░░░ DETAY SATIRLARI ░░░ -->
                  <tr>
                    <td colspan="2" style="background-color:#ffffff;padding:0 28px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation" style="margin:24px 0;">

                        <!-- Başlık -->
                        <tr>
                          <td colspan="2" style="padding-bottom:10px;">
                            <span style="font-size:10px;font-weight:700;color:#94a3b8;letter-spacing:1.5px;text-transform:uppercase;">Talep Detayları</span>
                          </td>
                        </tr>

                        <!-- Kayıt No -->
                        <tr>
                          <td style="padding:11px 0;border-top:1px solid #f1f5f9;vertical-align:middle;">
                            <span style="font-size:12px;color:#94a3b8;font-weight:500;">Kayıt No</span>
                          </td>
                          <td align="right" style="padding:11px 0;border-top:1px solid #f1f5f9;vertical-align:middle;">
                            <table cellpadding="0" cellspacing="0" border="0" role="presentation" align="right">
                              <tr>
                                <td style="background-color:#f1f5f9;border-radius:6px;padding:4px 12px;">
                                  <span style="font-size:12px;font-weight:800;color:{{accentColor}};font-variant-numeric:tabular-nums;">{{formRequestNo}}</span>
                                </td>
                              </tr>
                            </table>
                          </td>
                        </tr>

                        <!-- Talep Eden -->
                        <tr>
                          <td style="padding:11px 0;border-top:1px solid #f1f5f9;vertical-align:middle;">
                            <span style="font-size:12px;color:#94a3b8;font-weight:500;">Talep Eden</span>
                          </td>
                          <td align="right" style="padding:11px 0;border-top:1px solid #f1f5f9;vertical-align:middle;">
                            <span style="font-size:13px;font-weight:700;color:#0f172a;">{{requesterName}}</span>
                          </td>
                        </tr>

                        <!-- Form Tipi -->
                        <tr>
                          <td style="padding:11px 0;border-top:1px solid #f1f5f9;vertical-align:middle;">
                            <span style="font-size:12px;color:#94a3b8;font-weight:500;">Form Tipi</span>
                          </td>
                          <td align="right" style="padding:11px 0;border-top:1px solid #f1f5f9;vertical-align:middle;">
                            <span style="font-size:13px;font-weight:700;color:#0f172a;">{{formTypeName}}</span>
                          </td>
                        </tr>

                      </table>
                    </td>
                  </tr>

                  <!-- ░░░ CTA BUTONU ░░░ -->
                  <tr>
                    <td colspan="2" style="background-color:#ffffff;padding:4px 28px 36px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation"
                             style="background-color:{{actionBgColor}};border-radius:10px;overflow:hidden;">
                        <tr>
                          <td style="padding:18px 22px;vertical-align:middle;">
                            <div style="font-size:14px;font-weight:800;color:#ffffff;">{{actionLabel}}</div>
                            <div style="font-size:11px;color:rgba(255,255,255,0.6);margin-top:3px;">{{formRequestNo}} &middot; {{formTypeName}}</div>
                          </td>
                          <td align="right" style="padding:18px 22px;vertical-align:middle;">
                            <a href="{{actionUrl}}"
                               style="display:inline-block;width:32px;height:32px;background-color:rgba(255,255,255,0.15);
                                      border-radius:50%;text-align:center;line-height:32px;
                                      font-size:16px;color:#ffffff;text-decoration:none;">&#8594;</a>
                          </td>
                        </tr>
                      </table>
                      <!-- URL yedek -->
                      <p style="text-align:center;font-size:11px;color:#94a3b8;margin:12px 0 0;word-break:break-all;line-height:1.6;">
                        Buton çalışmıyorsa:&nbsp;<a href="{{actionUrl}}" style="color:#3b82f6;text-decoration:underline;">{{actionUrl}}</a>
                      </p>
                    </td>
                  </tr>

                  <!-- ░░░ FOOTER ░░░ -->
                  <tr>
                    <td colspan="2" style="background-color:#0f172a;padding:20px 28px 8px;">
                      <table width="100%" cellpadding="0" cellspacing="0" border="0" role="presentation">
                        <tr>
                          <td valign="middle">
                            <span style="font-size:12px;font-weight:700;color:#475569;">{{brandName}}</span>
                            <span style="font-size:12px;color:#334155;">&nbsp;&middot;&nbsp;Kurumsal Form &amp; Onay Platformu</span>
                          </td>
                          <td align="right" valign="middle">
                            <span style="font-size:11px;color:#334155;">&copy; 2026</span>
                          </td>
                        </tr>
                      </table>
                    </td>
                  </tr>
                  <tr>
                    <td colspan="2" style="background-color:#0f172a;padding:0 28px 22px;">
                      <div style="height:1px;background-color:#1e293b;margin-bottom:12px;"></div>
                      <span style="font-size:11px;color:#334155;line-height:1.7;">
                        Bu e-posta otomatik olarak gönderilmiştir. Lütfen bu adrese doğrudan yanıt vermeyiniz.
                      </span>
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