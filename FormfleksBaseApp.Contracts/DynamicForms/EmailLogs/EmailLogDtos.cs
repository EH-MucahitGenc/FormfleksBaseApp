namespace FormfleksBaseApp.Contracts.DynamicForms.EmailLogs;

public class EmailLogListItemDto
{
    public Guid Id { get; set; }
    public string MessageType { get; set; } = default!;
    public string? ReferenceType { get; set; }
    public string? ReferenceId { get; set; }
    public string? FromAddress { get; set; }
    public IReadOnlyList<string> ToAddresses { get; set; } = Array.Empty<string>();
    public string Subject { get; set; } = default!;
    public short StatusCode { get; set; }
    public string Status { get; set; } = default!;
    public int AttemptCount { get; set; }
    public string? LastError { get; set; }
    public DateTime QueuedAt { get; set; }
    public DateTime? SentAt { get; set; }
}

public sealed class EmailLogDetailDto : EmailLogListItemDto
{
    public IReadOnlyList<string> CcAddresses { get; set; } = Array.Empty<string>();
    public IReadOnlyList<string> BccAddresses { get; set; } = Array.Empty<string>();
    public string? ReplyToAddress { get; set; }
    public string BodyHtml { get; set; } = default!;
    public string? BodyText { get; set; }
    public string BodySha256 { get; set; } = default!;
    public string HeadersJson { get; set; } = default!;
    public string AttachmentManifestJson { get; set; } = default!;
    public string? SmtpMessageId { get; set; }
    public DateTime? FirstAttemptAt { get; set; }
    public DateTime? LastAttemptAt { get; set; }
}
