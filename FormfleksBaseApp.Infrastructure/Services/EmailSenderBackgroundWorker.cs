using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Common.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;

namespace FormfleksBaseApp.Infrastructure.Services;

public sealed class EmailSenderBackgroundWorker : BackgroundService
{
    private readonly IEmailBackgroundQueue _emailQueue;
    private readonly IEmailSmtpSender _smtpSender;
    private readonly ILogger<EmailSenderBackgroundWorker> _logger;
    private readonly IOptionsMonitor<EmailSettings> _emailOptions;
    private readonly ISystemSettingsService _systemSettingsService;

    public EmailSenderBackgroundWorker(IEmailBackgroundQueue emailQueue, IEmailSmtpSender smtpSender,
        ILogger<EmailSenderBackgroundWorker> logger, IOptionsMonitor<EmailSettings> emailOptions,
        ISystemSettingsService systemSettingsService)
    {
        _emailQueue = emailQueue;
        _smtpSender = smtpSender;
        _logger = logger;
        _emailOptions = emailOptions;
        _systemSettingsService = systemSettingsService;
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Email outbox worker is starting.");
        while (!stoppingToken.IsCancellationRequested)
        {
            QueuedEmail? queuedEmail = null;
            try
            {
                queuedEmail = await _emailQueue.DequeueEmailAsync(stoppingToken);
                var settings = _systemSettingsService.GetSetting("EmailSettings", _emailOptions.CurrentValue) ?? new EmailSettings();
                if (!settings.Enabled)
                {
                    await _emailQueue.MarkSuppressedAsync(queuedEmail.Id,
                        "EmailSettings.Enabled is false; message was not transmitted.", stoppingToken);
                    continue;
                }

                var envelope = _smtpSender.CreateEnvelope(queuedEmail, settings);
                await _emailQueue.RecordEnvelopeAsync(queuedEmail.Id, envelope, stoppingToken);
                await _smtpSender.SendAsync(queuedEmail, envelope, settings, stoppingToken);
                await _emailQueue.MarkSentAsync(queuedEmail.Id, DateTime.UtcNow, stoppingToken);
            }
            catch (OperationCanceledException) when (stoppingToken.IsCancellationRequested)
            {
                break;
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Email delivery failed for outbox item {OutboxId}.", queuedEmail?.Id);
                if (queuedEmail is not null)
                {
                    try { await _emailQueue.MarkFailedAsync(queuedEmail.Id, ex.ToString(), CancellationToken.None); }
                    catch (Exception persistException)
                    {
                        _logger.LogCritical(persistException, "Could not persist email failure for outbox item {OutboxId}.", queuedEmail.Id);
                    }
                }
            }
        }
        _logger.LogInformation("Email outbox worker is stopping.");
    }
}
