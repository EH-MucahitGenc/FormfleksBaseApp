using System.Security.Cryptography;
using System.Text;
using System.Text.Json;
using FormfleksBaseApp.Application.Common.Models;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.DataAccess;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace FormfleksBaseApp.Infrastructure.Services;

public sealed record QueuedEmail(Guid Id, EmailMessage Message, int AttemptCount, int MaxAttempts, bool AlreadySent = false);

public sealed record EmailDeliveryEnvelope(string FromAddress, string HeadersJson, string SmtpMessageId, DateTime AttemptedAt);

public interface IEmailBackgroundQueue
{
    ValueTask<Guid> QueueEmailAsync(EmailMessage message, CancellationToken cancellationToken = default);
    ValueTask<QueuedEmail> QueueForImmediateDeliveryAsync(EmailMessage message, CancellationToken cancellationToken = default);
    ValueTask<QueuedEmail> DequeueEmailAsync(CancellationToken cancellationToken = default);
    Task RecordEnvelopeAsync(Guid id, EmailDeliveryEnvelope envelope, CancellationToken cancellationToken = default);
    Task MarkSentAsync(Guid id, DateTime sentAt, CancellationToken cancellationToken = default);
    Task MarkFailedAsync(Guid id, string error, CancellationToken cancellationToken = default);
    Task MarkSuppressedAsync(Guid id, string reason, CancellationToken cancellationToken = default);
}

public sealed class EmailBackgroundQueue : IEmailBackgroundQueue
{
    private static readonly JsonSerializerOptions JsonOptions = new(JsonSerializerDefaults.Web);
    private static readonly TimeSpan PollInterval = TimeSpan.FromSeconds(10);
    private static readonly TimeSpan ProcessingLease = TimeSpan.FromMinutes(10);
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly SemaphoreSlim _signal = new(0);

    public EmailBackgroundQueue(IServiceScopeFactory scopeFactory) => _scopeFactory = scopeFactory;

    public async ValueTask<Guid> QueueEmailAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        Validate(message);
        var entity = CreateEntity(message, EmailDeliveryStatus.Pending, 0);
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<DynamicFormsDbContext>();
        db.EmailOutbox.Add(entity);
        await db.SaveChangesAsync(cancellationToken);
        _signal.Release();
        return entity.Id;
    }

    public async ValueTask<QueuedEmail> QueueForImmediateDeliveryAsync(EmailMessage message, CancellationToken cancellationToken = default)
    {
        Validate(message);
        var now = DateTime.UtcNow;
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<DynamicFormsDbContext>();
        EmailOutboxEntity? entity = null;

        if (!string.IsNullOrWhiteSpace(message.DeduplicationKey))
            entity = await db.EmailOutbox.SingleOrDefaultAsync(x => x.DeduplicationKey == message.DeduplicationKey, cancellationToken);

        if (entity is null)
        {
            entity = CreateEntity(message, EmailDeliveryStatus.Processing, 1);
            db.EmailOutbox.Add(entity);
        }
        else if (entity.Status == EmailDeliveryStatus.Sent)
        {
            return ToQueuedEmail(entity, true);
        }
        else
        {
            entity.Status = EmailDeliveryStatus.Processing;
            entity.AttemptCount++;
            entity.FirstAttemptAt ??= now;
            entity.LastAttemptAt = now;
            entity.LockedAt = now;
            entity.LastError = null;
            entity.UpdatedAt = now;
        }

        await db.SaveChangesAsync(cancellationToken);
        return ToQueuedEmail(entity);
    }

    public async ValueTask<QueuedEmail> DequeueEmailAsync(CancellationToken cancellationToken = default)
    {
        while (!cancellationToken.IsCancellationRequested)
        {
            var claimed = await TryClaimNextAsync(cancellationToken);
            if (claimed is not null) return claimed;
            await _signal.WaitAsync(PollInterval, cancellationToken);
        }

        throw new OperationCanceledException(cancellationToken);
    }

    public Task RecordEnvelopeAsync(Guid id, EmailDeliveryEnvelope envelope, CancellationToken cancellationToken = default)
        => UpdateAsync(id, entity =>
        {
            entity.FromAddress = envelope.FromAddress;
            entity.HeadersJson = envelope.HeadersJson;
            entity.SmtpMessageId = envelope.SmtpMessageId;
            entity.LastAttemptAt = envelope.AttemptedAt;
        }, cancellationToken);

    public Task MarkSentAsync(Guid id, DateTime sentAt, CancellationToken cancellationToken = default)
        => UpdateAsync(id, entity =>
        {
            entity.Status = EmailDeliveryStatus.Sent;
            entity.SentAt = sentAt;
            entity.LockedAt = null;
            entity.LastError = null;
            entity.AttachmentPayloadJson = null;
        }, cancellationToken);

    public async Task MarkFailedAsync(Guid id, string error, CancellationToken cancellationToken = default)
    {
        await UpdateAsync(id, entity =>
        {
            entity.LastError = Truncate(error, 8000);
            entity.LockedAt = null;
            entity.Status = entity.AttemptCount >= entity.MaxAttempts ? EmailDeliveryStatus.DeadLetter : EmailDeliveryStatus.Failed;
            entity.NextAttemptAt = DateTime.UtcNow.Add(Backoff(entity.AttemptCount));
        }, cancellationToken);
        _signal.Release();
    }

    public Task MarkSuppressedAsync(Guid id, string reason, CancellationToken cancellationToken = default)
        => UpdateAsync(id, entity =>
        {
            entity.Status = EmailDeliveryStatus.Suppressed;
            entity.LastError = Truncate(reason, 8000);
            entity.LockedAt = null;
            entity.AttachmentPayloadJson = null;
        }, cancellationToken);

    private async Task<QueuedEmail?> TryClaimNextAsync(CancellationToken cancellationToken)
    {
        var now = DateTime.UtcNow;
        var staleBefore = now.Subtract(ProcessingLease);
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<DynamicFormsDbContext>();
        await using var transaction = await db.Database.BeginTransactionAsync(cancellationToken);

        var entity = await db.EmailOutbox
            .FromSqlInterpolated($"""
                SELECT * FROM email_outbox
                WHERE ((status IN ({(short)EmailDeliveryStatus.Pending}, {(short)EmailDeliveryStatus.Failed}) AND next_attempt_at <= {now})
                    OR (status = {(short)EmailDeliveryStatus.Processing} AND locked_at < {staleBefore}))
                ORDER BY queued_at
                FOR UPDATE SKIP LOCKED
                LIMIT 1
                """)
            .SingleOrDefaultAsync(cancellationToken);

        if (entity is null)
        {
            await transaction.RollbackAsync(cancellationToken);
            return null;
        }

        entity.Status = EmailDeliveryStatus.Processing;
        entity.AttemptCount++;
        entity.FirstAttemptAt ??= now;
        entity.LastAttemptAt = now;
        entity.LockedAt = now;
        entity.LastError = null;
        entity.UpdatedAt = now;
        await db.SaveChangesAsync(cancellationToken);
        await transaction.CommitAsync(cancellationToken);
        return ToQueuedEmail(entity);
    }

    private async Task UpdateAsync(Guid id, Action<EmailOutboxEntity> update, CancellationToken cancellationToken)
    {
        await using var scope = _scopeFactory.CreateAsyncScope();
        var db = scope.ServiceProvider.GetRequiredService<DynamicFormsDbContext>();
        var entity = await db.EmailOutbox.SingleAsync(x => x.Id == id, cancellationToken);
        update(entity);
        entity.UpdatedAt = DateTime.UtcNow;
        await db.SaveChangesAsync(cancellationToken);
    }

    private static EmailOutboxEntity CreateEntity(EmailMessage message, EmailDeliveryStatus status, int attemptCount)
    {
        var now = DateTime.UtcNow;
        var attachments = message.Attachments ?? new List<EmailAttachment>();
        var manifest = attachments.Select(x => new StoredAttachmentManifest(x.FileName, x.ContentType, x.Content.LongLength,
            Convert.ToHexString(SHA256.HashData(x.Content)).ToLowerInvariant())).ToList();
        var payload = attachments.Select(x => new StoredAttachmentPayload(x.FileName, x.ContentType, Convert.ToBase64String(x.Content))).ToList();

        return new EmailOutboxEntity
        {
            Id = Guid.NewGuid(),
            MessageType = string.IsNullOrWhiteSpace(message.MessageType) ? "General" : message.MessageType,
            ReferenceType = message.ReferenceType,
            ReferenceId = message.ReferenceId,
            DeduplicationKey = message.DeduplicationKey,
            ToAddressesJson = JsonSerializer.Serialize(NormalizeAddresses(message.ToAddresses), JsonOptions),
            CcAddressesJson = JsonSerializer.Serialize(NormalizeAddresses(message.CcAddresses), JsonOptions),
            BccAddressesJson = JsonSerializer.Serialize(NormalizeAddresses(message.BccAddresses), JsonOptions),
            ReplyToAddress = message.ReplyToAddress,
            Subject = message.Subject,
            BodyHtml = message.HtmlBody,
            BodyText = message.TextBody,
            BodySha256 = Convert.ToHexString(SHA256.HashData(Encoding.UTF8.GetBytes(message.HtmlBody))).ToLowerInvariant(),
            HeadersJson = JsonSerializer.Serialize(message.Headers, JsonOptions),
            AttachmentManifestJson = JsonSerializer.Serialize(manifest, JsonOptions),
            AttachmentPayloadJson = payload.Count == 0 ? null : JsonSerializer.Serialize(payload, JsonOptions),
            Status = status,
            AttemptCount = attemptCount,
            MaxAttempts = 5,
            QueuedAt = now,
            FirstAttemptAt = attemptCount > 0 ? now : null,
            LastAttemptAt = attemptCount > 0 ? now : null,
            NextAttemptAt = now,
            LockedAt = status == EmailDeliveryStatus.Processing ? now : null,
            UpdatedAt = now
        };
    }

    private static QueuedEmail ToQueuedEmail(EmailOutboxEntity entity, bool alreadySent = false)
    {
        var payloads = string.IsNullOrWhiteSpace(entity.AttachmentPayloadJson)
            ? new List<StoredAttachmentPayload>()
            : JsonSerializer.Deserialize<List<StoredAttachmentPayload>>(entity.AttachmentPayloadJson, JsonOptions) ?? new();
        var message = new EmailMessage
        {
            MessageType = entity.MessageType,
            ReferenceType = entity.ReferenceType,
            ReferenceId = entity.ReferenceId,
            DeduplicationKey = entity.DeduplicationKey,
            ToAddresses = DeserializeAddresses(entity.ToAddressesJson),
            CcAddresses = DeserializeAddresses(entity.CcAddressesJson),
            BccAddresses = DeserializeAddresses(entity.BccAddressesJson),
            ReplyToAddress = entity.ReplyToAddress,
            Subject = entity.Subject,
            HtmlBody = entity.BodyHtml,
            TextBody = entity.BodyText,
            Headers = JsonSerializer.Deserialize<Dictionary<string, string>>(entity.HeadersJson, JsonOptions) ?? new(),
            Attachments = payloads.Select(x => new EmailAttachment
            {
                FileName = x.FileName,
                ContentType = x.ContentType,
                Content = Convert.FromBase64String(x.ContentBase64)
            }).ToList()
        };
        return new QueuedEmail(entity.Id, message, entity.AttemptCount, entity.MaxAttempts, alreadySent);
    }

    private static List<string> NormalizeAddresses(IEnumerable<string>? addresses) => (addresses ?? Array.Empty<string>())
        .Where(x => !string.IsNullOrWhiteSpace(x)).Select(x => x.Trim()).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    private static List<string> DeserializeAddresses(string json) => JsonSerializer.Deserialize<List<string>>(json, JsonOptions) ?? new();
    private static TimeSpan Backoff(int attemptCount) => TimeSpan.FromSeconds(Math.Min(300, 5 * Math.Pow(2, Math.Max(0, attemptCount - 1))));
    private static string Truncate(string value, int maxLength) => value.Length <= maxLength ? value : value[..maxLength];

    private static void Validate(EmailMessage message)
    {
        ArgumentNullException.ThrowIfNull(message);
        if (message.ToAddresses.Count == 0) throw new ArgumentException("At least one recipient is required.", nameof(message));
        if (string.IsNullOrWhiteSpace(message.Subject)) throw new ArgumentException("Email subject is required.", nameof(message));
    }

    private sealed record StoredAttachmentManifest(string FileName, string ContentType, long Size, string Sha256);
    private sealed record StoredAttachmentPayload(string FileName, string ContentType, string ContentBase64);
}
