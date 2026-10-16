using System.Net;
using System.Net.Mail;
using System.Text.Json;
using FormfleksBaseApp.Application.Common.Models;
using Microsoft.Extensions.Logging;
using Polly;

namespace FormfleksBaseApp.Infrastructure.Services;

public interface IEmailSmtpSender
{
    EmailDeliveryEnvelope CreateEnvelope(QueuedEmail queuedEmail, EmailSettings settings);
    Task SendAsync(QueuedEmail queuedEmail, EmailDeliveryEnvelope envelope, EmailSettings settings, CancellationToken cancellationToken);
}

public sealed class EmailSmtpSender : IEmailSmtpSender
{
    private static readonly HashSet<string> ReservedHeaders = new(StringComparer.OrdinalIgnoreCase)
    {
        "Bcc", "Cc", "Content-Length", "Content-Type", "Date", "From", "Importance",
        "MIME-Version", "Priority", "Reply-To", "Sender", "Subject", "To", "X-Priority"
    };
    private readonly ILogger<EmailSmtpSender> _logger;

    public EmailSmtpSender(ILogger<EmailSmtpSender> logger) => _logger = logger;

    public EmailDeliveryEnvelope CreateEnvelope(QueuedEmail queuedEmail, EmailSettings settings)
    {
        var source = queuedEmail.Message;
        var fromAddress = string.IsNullOrWhiteSpace(settings.Smtp.DefaultFrom) ? settings.Smtp.Username : settings.Smtp.DefaultFrom;
        if (string.IsNullOrWhiteSpace(fromAddress)) throw new InvalidOperationException("SMTP sender address is not configured.");

        var domain = fromAddress.Contains('@') ? fromAddress[(fromAddress.IndexOf('@') + 1)..] : "formfleks.local";
        var smtpMessageId = $"<{queuedEmail.Id:N}@{domain}>";
        var attemptedAt = DateTime.UtcNow;
        var headers = new Dictionary<string, object?>(StringComparer.OrdinalIgnoreCase)
        {
            ["From"] = fromAddress,
            ["To"] = source.ToAddresses,
            ["Cc"] = source.CcAddresses,
            ["Bcc"] = source.BccAddresses,
            ["Reply-To"] = source.ReplyToAddress,
            ["Subject"] = source.Subject,
            ["Date"] = attemptedAt,
            ["Message-ID"] = smtpMessageId,
            ["MIME-Version"] = "1.0",
            ["Content-Type"] = "text/html; charset=utf-8",
            ["X-Formfleks-Outbox-Id"] = queuedEmail.Id,
            ["X-Formfleks-Message-Type"] = source.MessageType
        };
        foreach (var header in source.Headers) headers[header.Key] = header.Value;

        return new EmailDeliveryEnvelope(fromAddress,
            JsonSerializer.Serialize(headers, new JsonSerializerOptions(JsonSerializerDefaults.Web)),
            smtpMessageId, attemptedAt);
    }

    public async Task SendAsync(QueuedEmail queuedEmail, EmailDeliveryEnvelope envelope, EmailSettings settings, CancellationToken cancellationToken)
    {
        var smtp = settings.Smtp;
        if (string.IsNullOrWhiteSpace(smtp.Host)) throw new InvalidOperationException("SMTP server host is not configured.");

        using var client = new SmtpClient(smtp.Host, smtp.Port)
        {
            Timeout = smtp.TimeoutSeconds * 1000,
            EnableSsl = smtp.EnableSsl
        };
        if (!string.IsNullOrWhiteSpace(smtp.Username) && !string.IsNullOrWhiteSpace(smtp.Password))
        {
            client.UseDefaultCredentials = false;
            client.Credentials = new NetworkCredential(smtp.Username, smtp.Password);
        }

        using var mailMessage = BuildMailMessage(queuedEmail, envelope);
        using var cancellationRegistration = cancellationToken.Register(client.SendAsyncCancel);
        var retryPolicy = Policy.Handle<SmtpException>().Or<IOException>().WaitAndRetryAsync(
            smtp.RetryCount,
            retryAttempt => TimeSpan.FromMilliseconds(smtp.RetryDelayMs * Math.Pow(2, retryAttempt - 1)),
            (exception, delay, retryCount, _) => _logger.LogWarning(exception,
                "SMTP retry {RetryCount}/{MaxRetries} after {Delay}ms for outbox item {OutboxId}.",
                retryCount, smtp.RetryCount, delay.TotalMilliseconds, queuedEmail.Id));

        var circuitBreakerPolicy = Policy.Handle<SmtpException>().Or<IOException>().CircuitBreakerAsync(
            smtp.ExceptionsAllowedBeforeBreaking,
            TimeSpan.FromSeconds(smtp.DurationOfBreakSeconds),
            (exception, duration) => _logger.LogError(exception,
                "SMTP circuit opened for {DurationSeconds}s while sending outbox item {OutboxId}.",
                duration.TotalSeconds, queuedEmail.Id),
            () => _logger.LogInformation("SMTP circuit reset for outbox item {OutboxId}.", queuedEmail.Id),
            () => _logger.LogInformation("SMTP circuit is half-open for outbox item {OutboxId}.", queuedEmail.Id));

        await Policy.WrapAsync(retryPolicy, circuitBreakerPolicy)
            .ExecuteAsync(ct => client.SendMailAsync(mailMessage, ct), cancellationToken);
        _logger.LogInformation("Sent outbox item {OutboxId} to {RecipientCount} recipients. Subject: '{Subject}'.",
            queuedEmail.Id, queuedEmail.Message.ToAddresses.Count, queuedEmail.Message.Subject);
    }

    private static MailMessage BuildMailMessage(QueuedEmail queuedEmail, EmailDeliveryEnvelope envelope)
    {
        var source = queuedEmail.Message;
        var message = new MailMessage
        {
            From = new MailAddress(envelope.FromAddress, "Erkurt Holding-Formfleks Kurumsal Form ve Onay Platformu"),
            Subject = source.Subject,
            Body = source.HtmlBody,
            IsBodyHtml = true,
            BodyEncoding = System.Text.Encoding.UTF8,
            SubjectEncoding = System.Text.Encoding.UTF8
        };
        foreach (var address in source.ToAddresses) message.To.Add(address);
        foreach (var address in source.CcAddresses) message.CC.Add(address);
        foreach (var address in source.BccAddresses) message.Bcc.Add(address);
        if (!string.IsNullOrWhiteSpace(source.ReplyToAddress)) message.ReplyToList.Add(source.ReplyToAddress);

        message.Headers.Add("Message-ID", envelope.SmtpMessageId);
        message.Headers.Add("X-Formfleks-Outbox-Id", queuedEmail.Id.ToString());
        message.Headers.Add("X-Formfleks-Message-Type", source.MessageType);
        foreach (var header in source.Headers.Where(x => !ReservedHeaders.Contains(x.Key))) message.Headers[header.Key] = header.Value;

        foreach (var attachment in source.Attachments)
        {
            var stream = new MemoryStream(attachment.Content, writable: false);
            message.Attachments.Add(new Attachment(stream, attachment.FileName, attachment.ContentType));
        }
        return message;
    }
}
