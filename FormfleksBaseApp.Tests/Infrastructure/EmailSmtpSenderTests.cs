using System.Text.Json;
using FormfleksBaseApp.Application.Common.Models;
using FormfleksBaseApp.Infrastructure.Services;
using Microsoft.Extensions.Logging.Abstractions;

namespace FormfleksBaseApp.Tests.Infrastructure;

public sealed class EmailSmtpSenderTests
{
    [Fact]
    public void CreateEnvelope_CapturesAuditableHeadersAndStableMessageId()
    {
        var id = Guid.NewGuid();
        var queued = new QueuedEmail(id, new EmailMessage
        {
            MessageType = "ApprovalRequest",
            ToAddresses = ["manager1@example.com", "manager2@example.com"],
            CcAddresses = ["audit@example.com"],
            Subject = "Approval subject",
            HtmlBody = "<strong>Body</strong>",
            Headers = new Dictionary<string, string> { ["X-Correlation-Id"] = "corr-1" }
        }, 1, 5);
        var settings = new EmailSettings
        {
            Smtp = new SmtpSettings { Username = "smtp@example.com", DefaultFrom = "formfleks@example.com" }
        };

        var sender = new EmailSmtpSender(NullLogger<EmailSmtpSender>.Instance);
        var envelope = sender.CreateEnvelope(queued, settings);
        using var headers = JsonDocument.Parse(envelope.HeadersJson);

        Assert.Equal("formfleks@example.com", envelope.FromAddress);
        Assert.Equal($"<{id:N}@example.com>", envelope.SmtpMessageId);
        Assert.Equal("Approval subject", headers.RootElement.GetProperty("Subject").GetString());
        Assert.Equal(2, headers.RootElement.GetProperty("To").GetArrayLength());
        Assert.Equal("corr-1", headers.RootElement.GetProperty("X-Correlation-Id").GetString());
    }

    [Fact]
    public void CreateEnvelope_FallsBackToSmtpUsername()
    {
        var queued = new QueuedEmail(Guid.NewGuid(), new EmailMessage
        {
            ToAddresses = ["user@example.com"],
            Subject = "Subject",
            HtmlBody = "Body"
        }, 1, 5);
        var settings = new EmailSettings { Smtp = new SmtpSettings { Username = "smtp@example.com" } };

        var envelope = new EmailSmtpSender(NullLogger<EmailSmtpSender>.Instance).CreateEnvelope(queued, settings);

        Assert.Equal("smtp@example.com", envelope.FromAddress);
    }

    [Fact]
    public void CreateEnvelope_RejectsMissingSenderAddress()
    {
        var queued = new QueuedEmail(Guid.NewGuid(), new EmailMessage
        {
            ToAddresses = ["user@example.com"],
            Subject = "Subject",
            HtmlBody = "Body"
        }, 1, 5);

        Assert.Throws<InvalidOperationException>(() =>
            new EmailSmtpSender(NullLogger<EmailSmtpSender>.Instance).CreateEnvelope(queued, new EmailSettings()));
    }
}
