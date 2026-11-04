using System.Text.Json;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.AdminUsers.Interfaces;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetEmailLogs;
using FormfleksBaseApp.Contracts.DynamicForms.EmailLogs;
using FormfleksBaseApp.Contracts.DynamicForms.FormTracking;
using FormfleksBaseApp.Domain.Constants;
using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetFormTracking;

public sealed class GetFormTrackingListQueryHandler
    : IRequestHandler<GetFormTrackingListQuery, FormTrackingListResultDto>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IAdminUserRepository _users;

    public GetFormTrackingListQueryHandler(IDynamicFormsDbContext db, IAdminUserRepository users)
    {
        _db = db;
        _users = users;
    }

    public async Task<FormTrackingListResultDto> Handle(GetFormTrackingListQuery request, CancellationToken ct)
    {
        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 10, 100);
        var allUsers = await _users.GetAllUsersWithRolesAsync(ct);
        var usersById = allUsers.ToDictionary(x => x.Id);

        var query = from formRequest in _db.FormRequests.AsNoTracking()
                    join formType in _db.FormTypes.AsNoTracking() on formRequest.FormTypeId equals formType.Id
                    select new TrackingRequestRow
                    {
                        RequestId = formRequest.Id,
                        RequestNo = formRequest.RequestNo,
                        FormTypeName = formType.Name,
                        SystemUsageType = formType.SystemUsageType,
                        OwnerUserId = formRequest.RequestorUserId,
                        Status = formRequest.Status,
                        CurrentStepNo = formRequest.CurrentStepNo,
                        CreatedAt = formRequest.CreatedAt,
                        SubmittedAt = formRequest.SubmittedAt,
                        CompletedAt = formRequest.CompletedAt,
                        WaitingSince = formRequest.Status == (short)FormRequestStatus.Draft
                            ? _db.AuditLogs
                                  .Where(a => a.EntityId == formRequest.Id &&
                                              (a.ActionType == "DraftClaimed" ||
                                               a.ActionType == "DraftReassigned" ||
                                               a.ActionType == "DraftCreated" ||
                                               a.ActionType == "ProbationDraftCreated"))
                                  .Select(a => (DateTime?)a.CreatedAt)
                                  .Max() ?? formRequest.CreatedAt
                            : formRequest.Status == (short)FormRequestStatus.InApproval
                                ? _db.FormRequestApprovals
                                      .Where(a => a.RequestId == formRequest.Id &&
                                                  a.ActionAt.HasValue &&
                                                  a.StepNo < (formRequest.CurrentStepNo ?? int.MaxValue))
                                      .Select(a => a.ActionAt)
                                      .Max() ?? formRequest.SubmittedAt ?? formRequest.CreatedAt
                                : formRequest.CompletedAt ?? formRequest.SubmittedAt ?? formRequest.CreatedAt
                    };

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim().ToLower();
            query = query.Where(x =>
                x.RequestNo.ToLower().Contains(search) ||
                _db.FormRequestValues.Any(v =>
                    v.RequestId == x.RequestId &&
                    v.ValueText != null &&
                    v.ValueText.ToLower().Contains(search)));
        }

        if (!string.IsNullOrWhiteSpace(request.SystemUsageType))
            query = query.Where(x => x.SystemUsageType == request.SystemUsageType);

        if (request.Status.HasValue)
            query = query.Where(x => x.Status == request.Status.Value);

        if (request.StartDate.HasValue)
            query = query.Where(x => x.CreatedAt >= request.StartDate.Value);

        if (request.EndDate.HasValue)
        {
            var endExclusive = request.EndDate.Value.Date.AddDays(1);
            query = query.Where(x => x.CreatedAt < endExclusive);
        }

        if (!string.IsNullOrWhiteSpace(request.OwnerSearch))
        {
            var ownerSearch = request.OwnerSearch.Trim();
            var ownerIds = allUsers
                .Where(x => Contains(x.DisplayName, ownerSearch) || Contains(x.Email, ownerSearch))
                .Select(x => x.Id)
                .ToList();
            var ownerRoleIds = _db.UserRoles.AsNoTracking()
                .Where(x => ownerIds.Contains(x.UserId))
                .Select(x => x.RoleId);
            query = query.Where(x =>
                ownerIds.Contains(x.OwnerUserId) ||
                _db.FormRequestAssignments.Any(a => a.RequestId == x.RequestId && ownerIds.Contains(a.UserId)) ||
                _db.FormRequestApprovals.Any(a =>
                    a.RequestId == x.RequestId &&
                    ((a.AssigneeUserId.HasValue && ownerIds.Contains(a.AssigneeUserId.Value)) ||
                     (a.AssigneeRoleId.HasValue && ownerRoleIds.Contains(a.AssigneeRoleId.Value)))));
        }

        if (request.MinWaitingDays is > 0)
        {
            var waitingThreshold = DateTime.UtcNow.AddDays(-request.MinWaitingDays.Value);
            query = query.Where(x => x.WaitingSince <= waitingThreshold);
        }

        var totalCount = await query.CountAsync(ct);
        var rows = await query.OrderByDescending(x => x.CreatedAt)
            .Skip((page - 1) * pageSize)
            .Take(pageSize)
            .ToListAsync(ct);

        var items = await BuildItemsAsync(rows, usersById, ct);

        return new FormTrackingListResultDto
        {
            Items = items,
            TotalCount = totalCount,
            Page = page,
            PageSize = pageSize
        };
    }

    private async Task<List<FormTrackingListItemDto>> BuildItemsAsync(
        IReadOnlyList<TrackingRequestRow> rows,
        IReadOnlyDictionary<Guid, AppUser> usersById,
        CancellationToken ct)
    {
        if (rows.Count == 0)
            return [];

        var requestIds = rows.Select(x => x.RequestId).ToList();
        var requestIdStrings = requestIds.Select(x => x.ToString()).ToList();

        var values = await (from value in _db.FormRequestValues.AsNoTracking()
                            join field in _db.FormFields.AsNoTracking() on value.FieldId equals field.Id
                            where requestIds.Contains(value.RequestId) && value.ValueText != null
                            select new TrackingValueRow
                            {
                                RequestId = value.RequestId,
                                Label = field.Label,
                                Value = value.ValueText!
                            }).ToListAsync(ct);

        var assignments = await _db.FormRequestAssignments.AsNoTracking()
            .Where(x => requestIds.Contains(x.RequestId))
            .ToListAsync(ct);
        var approvals = await _db.FormRequestApprovals.AsNoTracking()
            .Where(x => requestIds.Contains(x.RequestId))
            .ToListAsync(ct);
        var workflowStepIds = approvals.Select(x => x.WorkflowStepId).Distinct().ToList();
        var workflowSteps = await _db.WorkflowSteps.AsNoTracking()
            .Where(x => workflowStepIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, ct);
        var roles = await _db.Roles.AsNoTracking().ToDictionaryAsync(x => x.Id, ct);
        var audits = await _db.AuditLogs.AsNoTracking()
            .Where(x => requestIds.Contains(x.EntityId))
            .ToListAsync(ct);
        var emails = await _db.EmailOutbox.AsNoTracking()
            .Where(x => x.ReferenceId != null && requestIdStrings.Contains(x.ReferenceId))
            .ToListAsync(ct);

        var now = DateTime.UtcNow;
        var items = new List<FormTrackingListItemDto>(rows.Count);
        foreach (var row in rows)
        {
            var rowValues = values.Where(x => x.RequestId == row.RequestId).ToList();
            var rowAssignments = assignments.Where(x => x.RequestId == row.RequestId).ToList();
            var rowApprovals = approvals.Where(x => x.RequestId == row.RequestId).ToList();
            var rowAudits = audits.Where(x => x.EntityId == row.RequestId).ToList();
            var rowEmails = emails.Where(x => x.ReferenceId == row.RequestId.ToString()).ToList();

            var owner = usersById.GetValueOrDefault(row.OwnerUserId);
            var draftCandidates = ResolveUsers(
                rowAssignments.Where(x => x.AssignmentType == (short)FormRequestAssignmentType.DraftEvaluator)
                    .Select(x => x.UserId), usersById);

            var pendingApproval = rowApprovals
                .Where(x => x.Status == (short)ApprovalStatus.Pending)
                .OrderBy(x => x.StepNo)
                .FirstOrDefault(x => !row.CurrentStepNo.HasValue || x.StepNo == row.CurrentStepNo.Value);

            var waitingSince = ResolveWaitingSince(row, rowApprovals, rowAudits);
            var currentAssignees = ResolveCurrentAssignees(
                pendingApproval, rowAssignments, workflowSteps, roles, usersById, rowEmails, waitingSince);

            var lastActivity = new[]
            {
                row.CreatedAt,
                row.SubmittedAt ?? DateTime.MinValue,
                row.CompletedAt ?? DateTime.MinValue,
                rowAudits.Select(x => x.CreatedAt).DefaultIfEmpty(DateTime.MinValue).Max(),
                rowApprovals.Where(x => x.ActionAt.HasValue).Select(x => x.ActionAt!.Value).DefaultIfEmpty(DateTime.MinValue).Max(),
                rowEmails.Select(x => x.UpdatedAt).DefaultIfEmpty(DateTime.MinValue).Max()
            }.Max();

            items.Add(new FormTrackingListItemDto
            {
                RequestId = row.RequestId,
                RequestNo = row.RequestNo,
                FormTypeName = row.FormTypeName,
                SystemUsageType = row.SystemUsageType,
                SubjectPersonName = FindValue(rowValues, "ADI SOYADI") ?? "Personel bilgisi bulunamadı",
                Department = FindValue(rowValues, "BÖLÜMÜ"),
                Title = FindValue(rowValues, "ÜNVANI"),
                StatusCode = row.Status,
                Status = GetRequestStatus(row.Status),
                OwnerUserId = row.OwnerUserId,
                OwnerName = GetUserName(owner),
                OwnerEmail = owner?.Email,
                CurrentStepNo = row.CurrentStepNo,
                CurrentStepName = pendingApproval is not null && workflowSteps.TryGetValue(pendingApproval.WorkflowStepId, out var step)
                    ? step.Name
                    : null,
                CurrentAssignees = currentAssignees,
                DraftCandidates = draftCandidates,
                IsPooledDraft = row.Status == (short)FormRequestStatus.Draft &&
                                row.OwnerUserId == ProbationFormConstants.SystemUserId &&
                                draftCandidates.Count > 1,
                CreatedAt = row.CreatedAt,
                LastActivityAt = lastActivity,
                WaitingSince = waitingSince,
                WaitingDays = Math.Max(0, (int)Math.Floor((now - waitingSince).TotalDays))
            });
        }

        return items;
    }

    private static DateTime ResolveWaitingSince(
        TrackingRequestRow row,
        IReadOnlyList<FormRequestApprovalEntity> approvals,
        IReadOnlyList<AuditLogEntity> audits)
    {
        if (row.Status == (short)FormRequestStatus.Draft)
        {
            return audits
                .Where(x => x.ActionType is "DraftClaimed" or "DraftReassigned" or "DraftCreated" or "ProbationDraftCreated")
                .Select(x => x.CreatedAt)
                .DefaultIfEmpty(row.CreatedAt)
                .Max();
        }

        if (row.Status == (short)FormRequestStatus.InApproval)
        {
            return approvals
                .Where(x => x.ActionAt.HasValue && x.StepNo < (row.CurrentStepNo ?? int.MaxValue))
                .Select(x => x.ActionAt!.Value)
                .DefaultIfEmpty(row.SubmittedAt ?? row.CreatedAt)
                .Max();
        }

        return row.CompletedAt ?? row.SubmittedAt ?? row.CreatedAt;
    }

    private static List<string> ResolveCurrentAssignees(
        FormRequestApprovalEntity? approval,
        IReadOnlyList<FormRequestAssignmentEntity> assignments,
        IReadOnlyDictionary<Guid, WorkflowStepEntity> workflowSteps,
        IReadOnlyDictionary<Guid, RoleEntity> roles,
        IReadOnlyDictionary<Guid, AppUser> users,
        IReadOnlyList<EmailOutboxEntity> emails,
        DateTime waitingSince)
    {
        if (approval is null)
            return [];

        var names = new List<string>();
        if (approval.AssigneeUserId.HasValue)
            names.Add(GetUserName(users.GetValueOrDefault(approval.AssigneeUserId.Value)));

        names.AddRange(ResolveUsers(
            assignments.Where(x => x.ApprovalId == approval.Id &&
                                   x.AssignmentType == (short)FormRequestAssignmentType.ApprovalCandidate)
                .Select(x => x.UserId), users));

        if (approval.AssigneeRoleId.HasValue && roles.TryGetValue(approval.AssigneeRoleId.Value, out var role))
            names.Add(role.Name);

        if (names.Count == 0)
        {
            var recipientEmails = emails
                .Where(x => x.MessageType == "ApprovalRequest" && x.QueuedAt >= waitingSince.AddSeconds(-5))
                .SelectMany(x => ParseAddresses(x.ToAddressesJson))
                .Distinct(StringComparer.OrdinalIgnoreCase)
                .ToList();

            foreach (var email in recipientEmails)
            {
                var user = users.Values.FirstOrDefault(x => string.Equals(x.Email, email, StringComparison.OrdinalIgnoreCase));
                names.Add(user is null ? email : GetUserName(user));
            }
        }

        if (names.Count == 0 && workflowSteps.TryGetValue(approval.WorkflowStepId, out var step))
            names.Add(step.Name);

        return names.Where(x => !string.IsNullOrWhiteSpace(x)).Distinct(StringComparer.OrdinalIgnoreCase).ToList();
    }

    private static List<string> ResolveUsers(IEnumerable<Guid> ids, IReadOnlyDictionary<Guid, AppUser> users)
        => ids.Distinct().Select(x => GetUserName(users.GetValueOrDefault(x))).ToList();

    private static string GetUserName(AppUser? user)
        => user is null ? "Bilinmeyen kullanıcı" : user.DisplayName?.Trim() is { Length: > 0 } name ? name : user.Email;

    private static bool Contains(string? value, string search)
        => value?.Contains(search, StringComparison.OrdinalIgnoreCase) == true;

    private static string? FindValue(IEnumerable<TrackingValueRow> values, string label)
        => values.FirstOrDefault(x => string.Equals(x.Label?.Trim(), label, StringComparison.OrdinalIgnoreCase))?.Value;

    private static IReadOnlyList<string> ParseAddresses(string json)
    {
        try
        {
            return JsonSerializer.Deserialize<List<string>>(json, new JsonSerializerOptions(JsonSerializerDefaults.Web)) ?? [];
        }
        catch
        {
            return [];
        }
    }

    internal static string GetRequestStatus(short status) => status switch
    {
        (short)FormRequestStatus.Draft => "Taslak",
        (short)FormRequestStatus.Submitted => "Gönderildi",
        (short)FormRequestStatus.InApproval => "Onayda",
        (short)FormRequestStatus.Approved => "Onaylandı",
        (short)FormRequestStatus.Rejected => "Reddedildi",
        (short)FormRequestStatus.Cancelled => "İptal edildi",
        (short)FormRequestStatus.ReturnedForRevision => "Revizyonda",
        _ => "Bilinmiyor"
    };
}

public sealed class GetFormTrackingDetailQueryHandler
    : IRequestHandler<GetFormTrackingDetailQuery, FormTrackingDetailDto?>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IAdminUserRepository _users;
    private readonly IMediator _mediator;

    public GetFormTrackingDetailQueryHandler(IDynamicFormsDbContext db, IAdminUserRepository users, IMediator mediator)
    {
        _db = db;
        _users = users;
        _mediator = mediator;
    }

    public async Task<FormTrackingDetailDto?> Handle(GetFormTrackingDetailQuery request, CancellationToken ct)
    {
        var formRequest = await _db.FormRequests.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.RequestId, ct);
        if (formRequest is null)
            return null;

        var listResult = await _mediator.Send(new GetFormTrackingListQuery
        {
            Search = formRequest.RequestNo,
            Page = 1,
            PageSize = 10
        }, ct);
        var summary = listResult.Items.SingleOrDefault(x => x.RequestId == request.RequestId);
        if (summary is null)
            return null;

        var users = (await _users.GetAllUsersWithRolesAsync(ct)).ToDictionary(x => x.Id);
        var approvals = await _db.FormRequestApprovals.AsNoTracking()
            .Where(x => x.RequestId == request.RequestId)
            .ToListAsync(ct);
        var approvalIds = approvals.Select(x => x.Id).ToList();
        var workflowStepIds = approvals.Select(x => x.WorkflowStepId).Distinct().ToList();
        var workflowSteps = await _db.WorkflowSteps.AsNoTracking()
            .Where(x => workflowStepIds.Contains(x.Id))
            .ToDictionaryAsync(x => x.Id, ct);
        var assignments = await _db.FormRequestAssignments.AsNoTracking()
            .Where(x => x.RequestId == request.RequestId)
            .ToListAsync(ct);
        var audits = await _db.AuditLogs.AsNoTracking()
            .Where(x => x.EntityId == request.RequestId ||
                        (x.EntityType == "FormRequestApproval" && approvalIds.Contains(x.EntityId)))
            .ToListAsync(ct);
        var requestIdText = request.RequestId.ToString();
        var emails = await _db.EmailOutbox.AsNoTracking()
            .Where(x => x.ReferenceId == requestIdText || x.Subject.Contains(formRequest.RequestNo))
            .ToListAsync(ct);

        var events = new List<FormTrackingEventDto>
        {
            new()
            {
                Id = $"created-{request.RequestId}",
                Category = "system",
                EventType = "FormCreated",
                Title = "Form oluşturuldu",
                Description = $"{summary.FormTypeName} kaydı oluşturuldu.",
                ActorName = summary.OwnerName,
                OccurredAt = formRequest.CreatedAt
            }
        };

        foreach (var group in assignments
                     .GroupBy(x => new { x.AssignmentType, Second = new DateTime(x.CreatedAt.Ticks - x.CreatedAt.Ticks % TimeSpan.TicksPerSecond, DateTimeKind.Utc) }))
        {
            var names = group.Select(x => GetUserName(users.GetValueOrDefault(x.UserId)))
                .Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            events.Add(new FormTrackingEventDto
            {
                Id = $"assignment-{group.First().Id}",
                Category = "assignment",
                EventType = group.Key.AssignmentType == (short)FormRequestAssignmentType.DraftEvaluator
                    ? "DraftCandidatesAssigned"
                    : "ApprovalCandidatesAssigned",
                Title = group.Key.AssignmentType == (short)FormRequestAssignmentType.DraftEvaluator
                    ? "Taslak adayları belirlendi"
                    : "Onay adayları belirlendi",
                Description = string.Join(", ", names),
                OccurredAt = group.Min(x => x.CreatedAt),
                Count = names.Count
            });
        }

        foreach (var audit in audits)
        {
            var (title, description) = DescribeAudit(audit, approvals, workflowSteps);
            events.Add(new FormTrackingEventDto
            {
                Id = $"audit-{audit.Id}",
                Category = "action",
                EventType = audit.ActionType,
                Title = title,
                Description = description,
                ActorName = audit.ActorUserId.HasValue ? GetUserName(users.GetValueOrDefault(audit.ActorUserId.Value)) : "Sistem",
                OccurredAt = audit.CreatedAt,
                DetailJson = audit.DetailJson
            });
        }

        foreach (var group in emails.GroupBy(x => new
                 {
                     x.MessageType,
                     Day = x.QueuedAt.Date,
                     x.Subject,
                     x.Status
                 }))
        {
            var recipients = group.SelectMany(x => ParseAddresses(x.ToAddressesJson))
                .Distinct(StringComparer.OrdinalIgnoreCase).ToList();
            var first = group.OrderBy(x => x.QueuedAt).First();
            events.Add(new FormTrackingEventDto
            {
                Id = $"email-{first.Id}",
                Category = "email",
                EventType = first.MessageType,
                Title = GetEmailTitle(first.MessageType, group.Count()),
                Description = first.Subject,
                OccurredAt = group.Min(x => x.QueuedAt),
                DeliveryStatus = GetEmailStatus(first.Status),
                Recipients = recipients,
                Count = group.Count(),
                EmailLogId = first.Id
            });
        }

        return new FormTrackingDetailDto
        {
            Summary = summary,
            Events = events.OrderByDescending(x => x.OccurredAt).ToList()
        };
    }

    private static (string Title, string? Description) DescribeAudit(
        AuditLogEntity audit,
        IReadOnlyList<FormRequestApprovalEntity> approvals,
        IReadOnlyDictionary<Guid, WorkflowStepEntity> workflowSteps)
    {
        var stepNo = TryReadInt(audit.DetailJson, "StepNo");
        var stepName = stepNo.HasValue
            ? approvals.Where(x => x.StepNo == stepNo.Value)
                .Select(x => workflowSteps.GetValueOrDefault(x.WorkflowStepId)?.Name)
                .FirstOrDefault(x => !string.IsNullOrWhiteSpace(x))
            : null;
        var comment = TryReadString(audit.DetailJson, "Comment");

        return audit.ActionType switch
        {
            "DraftCreated" => ("Taslak oluşturuldu", null),
            "ProbationDraftCreated" => ("Deneme formu otomatik oluşturuldu", null),
            "DraftClaimed" => ("Taslak üstlenildi", null),
            "DraftReassigned" => ("Taslak devredildi", BuildReassignmentDescription(audit.DetailJson)),
            "FormSubmitted" => ("Form onaya gönderildi", stepName),
            "Approved" => ($"{stepName ?? "Onay adımı"} onaylandı", comment),
            "Rejected" => ($"{stepName ?? "Onay adımı"} reddedildi", comment),
            "ReturnedForRevision" => ($"{stepName ?? "Onay adımı"} revizyona gönderildi", comment),
            "Reassigned" => ($"{stepName ?? "Onay adımı"} devredildi", comment),
            "Cancel" => ("Form iptal edildi", comment),
            "DeleteDraft" => ("Taslak silindi", comment),
            _ => (audit.ActionType, comment)
        };
    }

    private static string? BuildReassignmentDescription(string? json)
    {
        var previous = TryReadString(json, "PreviousOwnerName");
        var next = TryReadString(json, "NewOwnerName");
        return previous is null && next is null ? null : $"{previous ?? "Bilinmeyen"} → {next ?? "Bilinmeyen"}";
    }

    private static int? TryReadInt(string? json, string property)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var document = JsonDocument.Parse(json);
            if (!document.RootElement.TryGetProperty(property, out var value)) return null;
            if (value.ValueKind == JsonValueKind.Number && value.TryGetInt32(out var number)) return number;
            return value.ValueKind == JsonValueKind.String && int.TryParse(value.GetString(), out number) ? number : null;
        }
        catch { return null; }
    }

    private static string? TryReadString(string? json, string property)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;
        try
        {
            using var document = JsonDocument.Parse(json);
            return document.RootElement.TryGetProperty(property, out var value) ? value.ToString() : null;
        }
        catch { return null; }
    }

    private static string GetEmailTitle(string messageType, int count) => messageType switch
    {
        "ProbationDraft" => "Deneme formu bildirimi gönderildi",
        "DraftReassigned" => "Taslak devir bildirimi gönderildi",
        "DraftReminder" => count > 1 ? $"{count} taslak hatırlatması gönderildi" : "Taslak hatırlatması gönderildi",
        "ApprovalRequest" => count > 1 ? $"{count} onay isteği gönderildi" : "Onay isteği gönderildi",
        "ApprovalReminder" => count > 1 ? $"{count} onay hatırlatması gönderildi" : "Onay hatırlatması gönderildi",
        _ => count > 1 ? $"{count} e-posta hareketi" : "E-posta gönderimi"
    };

    private static string GetEmailStatus(EmailDeliveryStatus status) => status switch
    {
        EmailDeliveryStatus.Pending => "Bekliyor",
        EmailDeliveryStatus.Processing => "İşleniyor",
        EmailDeliveryStatus.Sent => "Gönderildi",
        EmailDeliveryStatus.Failed => "Başarısız",
        EmailDeliveryStatus.DeadLetter => "Kalıcı hata",
        EmailDeliveryStatus.Suppressed => "Bastırıldı",
        _ => "Bilinmiyor"
    };

    private static IReadOnlyList<string> ParseAddresses(string json)
    {
        try { return JsonSerializer.Deserialize<List<string>>(json) ?? []; }
        catch { return []; }
    }

    private static string GetUserName(AppUser? user)
        => user is null ? "Bilinmeyen kullanıcı" : user.DisplayName?.Trim() is { Length: > 0 } name ? name : user.Email;
}

public sealed class GetFormTrackingEmailDetailQueryHandler
    : IRequestHandler<GetFormTrackingEmailDetailQuery, FormTrackingEmailDetailDto?>
{
    private readonly IDynamicFormsDbContext _db;

    public GetFormTrackingEmailDetailQueryHandler(IDynamicFormsDbContext db) => _db = db;

    public async Task<FormTrackingEmailDetailDto?> Handle(GetFormTrackingEmailDetailQuery request, CancellationToken ct)
    {
        var formRequest = await _db.FormRequests.AsNoTracking()
            .SingleOrDefaultAsync(x => x.Id == request.RequestId, ct);
        if (formRequest is null)
            return null;

        var row = await _db.EmailOutbox.AsNoTracking().SingleOrDefaultAsync(x => x.Id == request.EmailId, ct);
        if (row is null ||
            (!string.Equals(row.ReferenceId, request.RequestId.ToString(), StringComparison.OrdinalIgnoreCase) &&
             !row.Subject.Contains(formRequest.RequestNo, StringComparison.OrdinalIgnoreCase)))
            return null;

        var list = GetEmailLogsQueryHandler.MapListItem(row);
        return new FormTrackingEmailDetailDto
        {
            RequestId = request.RequestId,
            Email = new EmailLogDetailDto
            {
                Id = list.Id,
                MessageType = list.MessageType,
                ReferenceType = list.ReferenceType,
                ReferenceId = list.ReferenceId,
                FromAddress = list.FromAddress,
                ToAddresses = list.ToAddresses,
                CcAddresses = GetEmailLogsQueryHandler.ParseAddresses(row.CcAddressesJson),
                BccAddresses = GetEmailLogsQueryHandler.ParseAddresses(row.BccAddressesJson),
                ReplyToAddress = row.ReplyToAddress,
                Subject = row.Subject,
                BodyHtml = row.BodyHtml,
                BodyText = row.BodyText,
                BodySha256 = row.BodySha256,
                HeadersJson = row.HeadersJson,
                AttachmentManifestJson = row.AttachmentManifestJson,
                StatusCode = list.StatusCode,
                Status = list.Status,
                AttemptCount = row.AttemptCount,
                LastError = row.LastError,
                SmtpMessageId = row.SmtpMessageId,
                QueuedAt = row.QueuedAt,
                FirstAttemptAt = row.FirstAttemptAt,
                LastAttemptAt = row.LastAttemptAt,
                SentAt = row.SentAt
            }
        };
    }
}

internal sealed class TrackingRequestRow
{
    public Guid RequestId { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public string FormTypeName { get; set; } = string.Empty;
    public string? SystemUsageType { get; set; }
    public Guid OwnerUserId { get; set; }
    public short Status { get; set; }
    public int? CurrentStepNo { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? CompletedAt { get; set; }
    public DateTime WaitingSince { get; set; }
}

internal sealed class TrackingValueRow
{
    public Guid RequestId { get; set; }
    public string? Label { get; set; }
    public string Value { get; set; } = string.Empty;
}
