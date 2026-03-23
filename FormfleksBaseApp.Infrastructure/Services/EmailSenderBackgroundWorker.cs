using System.Net;
using System.Net.Mail;
using FormfleksBaseApp.Application.Common.Models;
using Microsoft.Extensions.Hosting;
using Microsoft.Extensions.Logging;
using Microsoft.Extensions.Options;
using Polly;
using Polly.CircuitBreaker;
using Polly.Retry;
using Polly.Wrap;

namespace FormfleksBaseApp.Infrastructure.Services;

public class EmailSenderBackgroundWorker : BackgroundService
{
    private readonly IEmailBackgroundQueue _emailQueue;
    private readonly ILogger<EmailSenderBackgroundWorker> _logger;
    private readonly IOptionsMonitor<EmailSettings> _emailOptions;
    private AsyncPolicyWrap _resiliencePolicy = default!;

    public EmailSenderBackgroundWorker(IEmailBackgroundQueue emailQueue, ILogger<EmailSenderBackgroundWorker> logger, IOptionsMonitor<EmailSettings> emailOptions)
    {
        _emailQueue = emailQueue;
        _logger = logger;
        _emailOptions = emailOptions;

        // Configure Polly Policies initially based on current appsettings
        ConfigurePolicies(_emailOptions.CurrentValue);

        // Re-configure if file changes
        _emailOptions.OnChange(settings => ConfigurePolicies(settings));
    }

    private void ConfigurePolicies(EmailSettings settings)
    {
        var smtpSettings = settings.Smtp;

        var retryPolicy = Policy
            .Handle<SmtpException>()
            .Or<IOException>()
            .WaitAndRetryAsync(
                smtpSettings.RetryCount,
                retryAttempt => TimeSpan.FromMilliseconds(smtpSettings.RetryDelayMs * Math.Pow(2, retryAttempt - 1)),
                onRetry: (exception, timespan, retryCount, context) =>
                {
                    _logger.LogWarning(exception, "SMTP Error. Retrying {RetryCount}/{MaxRetries} after {Delay}ms.", retryCount, smtpSettings.RetryCount, timespan.TotalMilliseconds);
                });

        var circuitBreakerPolicy = Policy
            .Handle<SmtpException>()
            .Or<IOException>()
            .CircuitBreakerAsync(
                exceptionsAllowedBeforeBreaking: smtpSettings.ExceptionsAllowedBeforeBreaking,
                durationOfBreak: TimeSpan.FromSeconds(smtpSettings.DurationOfBreakSeconds),
                onBreak: (exception, duration) =>
                {
                    _logger.LogError(exception, "SMTP Circuit Breaker OPEN! Breaking logic for {DurationSeconds} seconds.", duration.TotalSeconds);
                },
                onReset: () =>
                {
                    _logger.LogInformation("SMTP Circuit Breaker CLOSED. Normal operation resumed.");
                },
                onHalfOpen: () =>
                {
                    _logger.LogInformation("SMTP Circuit Breaker HALF-OPEN. Testing SMTP connection...");
                });

        _resiliencePolicy = Policy.WrapAsync(retryPolicy, circuitBreakerPolicy);
    }

    protected override async Task ExecuteAsync(CancellationToken stoppingToken)
    {
        _logger.LogInformation("Email Background Worker Service is starting. Initial [Enabled] state: {Enabled}", _emailOptions.CurrentValue.Enabled);

        while (!stoppingToken.IsCancellationRequested)
        {
            try
            {
                var emailMessage = await _emailQueue.DequeueEmailAsync(stoppingToken);
                var currentSettings = _emailOptions.CurrentValue;

                if (currentSettings.Enabled)
                {
                    _logger.LogInformation("Email Worker: Transmitting email to {To}. SMTP Server: {Host}:{Port}, AuthUser: {User}", 
                        string.Join(", ", emailMessage.ToAddresses), currentSettings.Smtp.Host, currentSettings.Smtp.Port, currentSettings.Smtp.Username);
                        
                    // Execute SMTP transmission wrapped with Retry and Circuit Breaker
                    await _resiliencePolicy.ExecuteAsync(async (ct) =>
                    {
                        await SendEmailViaSmtpAsync(emailMessage, currentSettings, ct);
                    }, stoppingToken);
                }
                else
                {
                    _logger.LogWarning("Discarding dynamically queued email to {To} as global EmailSettings.Enabled is false.", string.Join(", ", emailMessage.ToAddresses));
                }
            }
            catch (OperationCanceledException)
            {
                // Triggered strictly during shutdown. Ignoring.
            }
            catch (BrokenCircuitException bce)
            {
                _logger.LogError(bce, "Email transmission skipped. SMTP Circuit is currently broken. Discarding mail from queue...");
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "A fatal error occurred in the resilient Email Worker execution loop.");
            }
        }

        _logger.LogInformation("Email Background Worker Service is stopping.");
    }

    private async Task SendEmailViaSmtpAsync(EmailMessage message, EmailSettings settings, CancellationToken cancellationToken)
    {
        var smtpSettings = settings.Smtp;

        if (string.IsNullOrWhiteSpace(smtpSettings.Host))
        {
            _logger.LogWarning("SMTP Server Host is not properly configured. Email sending bypassed.");
            return;
        }

        using var client = new SmtpClient(smtpSettings.Host, smtpSettings.Port);
        
        // Setup internal timeout
        client.Timeout = smtpSettings.TimeoutSeconds * 1000;
        
        client.EnableSsl = smtpSettings.EnableSsl;
        if (!string.IsNullOrWhiteSpace(smtpSettings.Username) && !string.IsNullOrWhiteSpace(smtpSettings.Password))
        {
            client.UseDefaultCredentials = false;
            client.Credentials = new NetworkCredential(smtpSettings.Username, smtpSettings.Password);
        }

        using var mailMessage = new MailMessage
        {
            From = new MailAddress(string.IsNullOrWhiteSpace(smtpSettings.DefaultFrom) ? smtpSettings.Username : smtpSettings.DefaultFrom),
            Subject = message.Subject,
            Body = message.HtmlBody,
            IsBodyHtml = true
        };

        foreach (var to in message.ToAddresses)
        {
            mailMessage.To.Add(to);
        }

        // Send mail gracefully
        using var ctRegistration = cancellationToken.Register(() => client.SendAsyncCancel());
        
        await client.SendMailAsync(mailMessage, cancellationToken);
        _logger.LogInformation("Successfully sent email to {Count} recipients. Subject: '{Subject}'.", message.ToAddresses.Count, message.Subject);
    }
}
