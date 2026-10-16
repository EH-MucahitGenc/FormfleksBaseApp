using System.Text.Json;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Contracts.DynamicForms.EmailLogs;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetEmailLogs;

public sealed class GetEmailLogsQueryHandler : IRequestHandler<GetEmailLogsQuery, List<EmailLogListItemDto>>
{
    private readonly IDynamicFormsDbContext _db;
    public GetEmailLogsQueryHandler(IDynamicFormsDbContext db) => _db = db;

    public async Task<List<EmailLogListItemDto>> Handle(GetEmailLogsQuery request, CancellationToken cancellationToken)
    {
        var rows = await _db.EmailOutbox.AsNoTracking().OrderByDescending(x => x.QueuedAt).Take(500).ToListAsync(cancellationToken);
        return rows.Select(MapListItem).ToList();
    }

    internal static EmailLogListItemDto MapListItem(EmailOutboxEntity row) => new()
    {
        Id = row.Id,
        MessageType = row.MessageType,
        ReferenceType = row.ReferenceType,
        ReferenceId = row.ReferenceId,
        FromAddress = row.FromAddress,
        ToAddresses = ParseAddresses(row.ToAddressesJson),
        Subject = row.Subject,
        StatusCode = (short)row.Status,
        Status = row.Status.ToString(),
        AttemptCount = row.AttemptCount,
        LastError = row.LastError is { Length: > 500 } ? row.LastError[..500] : row.LastError,
        QueuedAt = row.QueuedAt,
        SentAt = row.SentAt
    };

    internal static IReadOnlyList<string> ParseAddresses(string json)
        => JsonSerializer.Deserialize<List<string>>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? new List<string>();
}

public sealed class GetEmailLogDetailQueryHandler : IRequestHandler<GetEmailLogDetailQuery, EmailLogDetailDto?>
{
    private readonly IDynamicFormsDbContext _db;
    public GetEmailLogDetailQueryHandler(IDynamicFormsDbContext db) => _db = db;

    public async Task<EmailLogDetailDto?> Handle(GetEmailLogDetailQuery request, CancellationToken cancellationToken)
    {
        var row = await _db.EmailOutbox.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.Id, cancellationToken);
        if (row is null) return null;

        var list = GetEmailLogsQueryHandler.MapListItem(row);
        return new EmailLogDetailDto
        {
            Id = list.Id,
            MessageType = list.MessageType,
            ReferenceType = list.ReferenceType,
            ReferenceId = list.ReferenceId,
            FromAddress = list.FromAddress,
            ToAddresses = list.ToAddresses,
            Subject = list.Subject,
            StatusCode = list.StatusCode,
            Status = list.Status,
            AttemptCount = list.AttemptCount,
            LastError = row.LastError,
            QueuedAt = list.QueuedAt,
            SentAt = list.SentAt,
            CcAddresses = GetEmailLogsQueryHandler.ParseAddresses(row.CcAddressesJson),
            BccAddresses = GetEmailLogsQueryHandler.ParseAddresses(row.BccAddressesJson),
            ReplyToAddress = row.ReplyToAddress,
            BodyHtml = row.BodyHtml,
            BodyText = row.BodyText,
            BodySha256 = row.BodySha256,
            HeadersJson = row.HeadersJson,
            AttachmentManifestJson = row.AttachmentManifestJson,
            SmtpMessageId = row.SmtpMessageId,
            FirstAttemptAt = row.FirstAttemptAt,
            LastAttemptAt = row.LastAttemptAt
        };
    }
}
