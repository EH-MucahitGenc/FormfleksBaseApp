namespace FormfleksBaseApp.Contracts.DynamicForms.AuditLogs;

public sealed class AuditLogItemDto
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = default!;
    public Guid EntityId { get; set; }
    public string ActionType { get; set; } = default!;
    public Guid? ActorUserId { get; set; }
    public string? DetailJson { get; set; }
    public DateTime CreatedAt { get; set; }
}

public sealed class AuditLogActionRequestDto
{
    public string EntityType { get; set; } = default!;
    public Guid EntityId { get; set; }
    public string ActionType { get; set; } = default!;
    public Guid? ActorUserId { get; set; }
    public string? DetailJson { get; set; }
}
