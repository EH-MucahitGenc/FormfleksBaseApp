namespace FormfleksBaseApp.Domain.Entities.DynamicForms;

/// <summary>
/// Dinamik form sistemindeki rol tanımlarını tutan varlık.
/// </summary>
public sealed class RoleEntity
{
    public Guid Id { get; set; }
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public bool Active { get; set; }
}

/// <summary>
/// Kullanıcı ve Rol arasındaki çoka çok (many-to-many) ilişkiyi tutan varlık.
/// </summary>
public sealed class UserRoleEntity
{
    public Guid UserId { get; set; }
    public Guid RoleId { get; set; }
}



/// <summary>
/// Bir form şablonunun (Örn: İzin Formu, Masraf Formu) ana tanımını tutan varlık.
/// </summary>
public sealed class FormTypeEntity
{
    public Guid Id { get; set; }
    public string Code { get; set; } = default!;
    public string Name { get; set; } = default!;
    public string? Description { get; set; }
    public bool Active { get; set; }
    public Guid CreatedByUserId { get; set; }
    public DateTime CreatedAt { get; set; }
}

/// <summary>
/// Form şablonu içerisindeki bölümleri (sekmeler/gruplar) tanımlayan varlık.
/// </summary>
public sealed class FormSectionEntity
{
    public Guid Id { get; set; }
    public Guid FormTypeId { get; set; }
    public string Title { get; set; } = default!;
    public int SortOrder { get; set; }
}

/// <summary>
/// Form şablonu içerisindeki her bir alanı (TextBox, Dropdown vb.) ve kurallarını tanımlayan varlık.
/// </summary>
public sealed class FormFieldEntity
{
    public Guid Id { get; set; }
    public Guid FormTypeId { get; set; }
    public Guid? SectionId { get; set; }
    public string FieldKey { get; set; } = default!;
    public string Label { get; set; } = default!;
    public short FieldType { get; set; }
    public bool IsRequired { get; set; }
    public string? Placeholder { get; set; }
    public string? HelpText { get; set; }
    public int SortOrder { get; set; }
    public string? DefaultValue { get; set; }
    public string? VisibilityRuleJson { get; set; }
    public string? ValidationRuleJson { get; set; }
    public string? OptionsJson { get; set; }
    public bool Active { get; set; }
}

/// <summary>
/// Bir form şablonuna ait onay iş akışının genel tanımını ve versiyonunu tutan varlık.
/// </summary>
public sealed class WorkflowDefinitionEntity
{
    public Guid Id { get; set; }
    public Guid FormTypeId { get; set; }
    public int VersionNo { get; set; }
    public bool IsActive { get; set; }
}

/// <summary>
/// İş akışındaki her bir onay adımını (Kim onaylayacak, kural ne vb.) tanımlayan varlık.
/// </summary>
public sealed class WorkflowStepEntity
{
    public Guid Id { get; set; }
    public Guid WorkflowDefinitionId { get; set; }
    public int StepNo { get; set; }
    public string Name { get; set; } = default!;
    public short AssigneeType { get; set; }
    public Guid? AssigneeUserId { get; set; }
    public Guid? AssigneeRoleId { get; set; }
    public string? DynamicRuleJson { get; set; }
    public bool AllowReturnForRevision { get; set; }
    
    // Enterprise Workflow Additions
    public short FallbackAction { get; set; } // 0=Skip, 1=FallToUpperManager, 2=FallToFixedUser
    public Guid? FallbackUserId { get; set; }
    public bool IsParallel { get; set; }
}

/// <summary>
/// Kullanıcılar tarafından doldurulan ve onaya sunulan her bir form talebinin ana kaydını tutan varlık.
/// </summary>
public sealed class FormRequestEntity
{
    public Guid Id { get; set; }
    public Guid FormTypeId { get; set; }
    public string RequestNo { get; set; } = default!;
    public Guid RequestorUserId { get; set; }
    public short Status { get; set; }
    public int? CurrentStepNo { get; set; }
    public long ConcurrencyToken { get; set; }
    public DateTime CreatedAt { get; set; }
    public DateTime? SubmittedAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    public void Submit(short newStatus)
    {
        Status = newStatus;
        SubmittedAt = DateTime.UtcNow;
    }

    public void Approve(short newStatus)
    {
        Status = newStatus;
        CompletedAt = DateTime.UtcNow;
    }

    public void Reject(short newStatus)
    {
        Status = newStatus;
        CompletedAt = DateTime.UtcNow;
    }

    public void ReturnForRevision(short newStatus)
    {
        Status = newStatus;
    }
}

/// <summary>
/// Bir form talebi doldurulurken girilen alan değerlerini (Cevapları) tutan varlık.
/// </summary>
public sealed class FormRequestValueEntity
{
    public Guid Id { get; set; }
    public Guid RequestId { get; set; }
    public Guid FieldId { get; set; }
    public string FieldKey { get; set; } = default!;
    public string? ValueText { get; set; }
    public decimal? ValueNumber { get; set; }
    public DateTime? ValueDateTime { get; set; }
    public bool? ValueBool { get; set; }
    public string? ValueJson { get; set; }
}

/// <summary>
/// Bir form talebi üzerindeki anlık onay işlemlerini, bekleyen adımları ve geçmiş aksiyonları tutan varlık.
/// </summary>
public sealed class FormRequestApprovalEntity
{
    public Guid Id { get; set; }
    public Guid RequestId { get; set; }
    public int StepNo { get; set; }
    public Guid WorkflowStepId { get; set; }
    public short Status { get; set; }
    public Guid? AssigneeUserId { get; set; }
    public Guid? AssigneeRoleId { get; set; }
    public Guid? ActionByUserId { get; set; }
    public string? ActionComment { get; set; }
    public DateTime? ActionAt { get; set; }
    public long ConcurrencyToken { get; set; }
}


/// <summary>
/// Sistem genelinde yapılan kritik işlemlerin (Kayıt, Güncelleme, Silme vb.) denetim izini (Audit) tutan varlık.
/// </summary>
public sealed class AuditLogEntity
{
    public Guid Id { get; set; }
    public string EntityType { get; set; } = default!;
    public Guid EntityId { get; set; }
    public string ActionType { get; set; } = default!;
    public Guid? ActorUserId { get; set; }
    public string? DetailJson { get; set; }
    public DateTime CreatedAt { get; set; }
}
