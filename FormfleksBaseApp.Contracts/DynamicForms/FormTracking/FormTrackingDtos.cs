using FormfleksBaseApp.Contracts.DynamicForms.EmailLogs;

namespace FormfleksBaseApp.Contracts.DynamicForms.FormTracking;

public sealed class FormTrackingListResultDto
{
    public IReadOnlyList<FormTrackingListItemDto> Items { get; set; } = Array.Empty<FormTrackingListItemDto>();
    public int TotalCount { get; set; }
    public int Page { get; set; }
    public int PageSize { get; set; }
}

public sealed class FormTrackingListItemDto
{
    public Guid RequestId { get; set; }
    public string RequestNo { get; set; } = string.Empty;
    public string FormTypeName { get; set; } = string.Empty;
    public string? SystemUsageType { get; set; }
    public string SubjectPersonName { get; set; } = string.Empty;
    public string? Department { get; set; }
    public string? Title { get; set; }
    public short StatusCode { get; set; }
    public string Status { get; set; } = string.Empty;
    public Guid OwnerUserId { get; set; }
    public string OwnerName { get; set; } = string.Empty;
    public string? OwnerEmail { get; set; }
    public int? CurrentStepNo { get; set; }
    public string? CurrentStepName { get; set; }
    public IReadOnlyList<string> CurrentAssignees { get; set; } = Array.Empty<string>();
    public IReadOnlyList<string> DraftCandidates { get; set; } = Array.Empty<string>();
    public bool IsPooledDraft { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime LastActivityAt { get; set; }
    public DateTime WaitingSince { get; set; }
    public int WaitingDays { get; set; }
}

public sealed class FormTrackingDetailDto
{
    public FormTrackingListItemDto Summary { get; set; } = new();
    public IReadOnlyList<FormTrackingEventDto> Events { get; set; } = Array.Empty<FormTrackingEventDto>();
}

public sealed class FormTrackingEventDto
{
    public string Id { get; set; } = string.Empty;
    public string Category { get; set; } = string.Empty;
    public string EventType { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string? ActorName { get; set; }
    public DateTime OccurredAt { get; set; }
    public string? DeliveryStatus { get; set; }
    public IReadOnlyList<string> Recipients { get; set; } = Array.Empty<string>();
    public int Count { get; set; } = 1;
    public Guid? EmailLogId { get; set; }
    public string? DetailJson { get; set; }
}

public sealed class FormTrackingEmailDetailDto
{
    public Guid RequestId { get; set; }
    public EmailLogDetailDto Email { get; set; } = new();
}
