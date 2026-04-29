namespace FormfleksBaseApp.Contracts.DynamicForms.AuditLogs;

/// <summary>
/// Sistem denetim izi (Audit Log) kayıtlarını listelemek için kullanılan veri modeli.
/// </summary>
public sealed class AuditLogItemDto
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = default!;
    public Guid EntityId { get; set; }
    public string ActionType { get; set; } = default!;
    public Guid? ActorUserId { get; set; }
    public string? ActorName { get; set; }
    public string? TargetName { get; set; }
    public string? DetailJson { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Yeni bir denetim izi (Audit Log) kaydı oluşturmak için kullanılan iç/dış istek modeli.
/// </summary>
public sealed class AuditLogActionRequestDto
{
    public string EntityType { get; set; } = default!;
    public Guid EntityId { get; set; }
    public string ActionType { get; set; } = default!;
    public Guid? ActorUserId { get; set; }
    public string? DetailJson { get; set; }
}
