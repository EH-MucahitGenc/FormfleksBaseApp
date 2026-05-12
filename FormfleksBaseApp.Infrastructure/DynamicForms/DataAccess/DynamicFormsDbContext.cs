using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.DynamicForms.DataAccess;

public sealed class DynamicFormsDbContext : DbContext, IDynamicFormsDbContext
{
    public DynamicFormsDbContext(DbContextOptions<DynamicFormsDbContext> options) : base(options)
    {
    }

    public DbSet<RoleEntity> Roles => Set<RoleEntity>();
    public DbSet<UserRoleEntity> UserRoles => Set<UserRoleEntity>();

    public DbSet<FormTypeEntity> FormTypes => Set<FormTypeEntity>();
    public DbSet<FormSectionEntity> FormSections => Set<FormSectionEntity>();
    public DbSet<FormFieldEntity> FormFields => Set<FormFieldEntity>();
    public DbSet<WorkflowDefinitionEntity> WorkflowDefinitions => Set<WorkflowDefinitionEntity>();
    public DbSet<WorkflowStepEntity> WorkflowSteps => Set<WorkflowStepEntity>();
    public DbSet<FormRequestEntity> FormRequests => Set<FormRequestEntity>();
    public DbSet<FormRequestValueEntity> FormRequestValues => Set<FormRequestValueEntity>();
    public DbSet<FormRequestApprovalEntity> FormRequestApprovals => Set<FormRequestApprovalEntity>();
    public DbSet<AuthorizationMatrixEntity> AuthorizationMatrix => Set<AuthorizationMatrixEntity>();
    public DbSet<AuditLogEntity> AuditLogs => Set<AuditLogEntity>();
    public DbSet<FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelAktarim> QdmsPersoneller => Set<FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelAktarim>();
    public DbSet<FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelSyncLog> QdmsPersonelSyncLogs => Set<FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelSyncLog>();
    public DbSet<UserDelegationEntity> UserDelegations => Set<UserDelegationEntity>();
    public DbSet<FormfleksBaseApp.Domain.Entities.Admin.HrAuthorization> HrAuthorizations => Set<FormfleksBaseApp.Domain.Entities.Admin.HrAuthorization>();

    protected override void OnModelCreating(ModelBuilder modelBuilder)
    {
        modelBuilder.Entity<UserDelegationEntity>(e =>
        {
            e.ToTable("user_delegations");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.DelegatorUserId).HasColumnName("delegator_user_id").HasColumnType("uuid");
            e.Property(x => x.DelegateeUserId).HasColumnName("delegatee_user_id").HasColumnType("uuid");
            e.Property(x => x.StartDate).HasColumnName("start_date").HasColumnType("timestamp with time zone");
            e.Property(x => x.EndDate).HasColumnName("end_date").HasColumnType("timestamp with time zone");
            e.Property(x => x.IsActive).HasColumnName("is_active").HasColumnType("boolean");
            e.Property(x => x.Reason).HasColumnName("reason").HasColumnType("character varying(300)").HasMaxLength(300);
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone");
            
            e.HasIndex(x => x.DelegatorUserId);
            e.HasIndex(x => new { x.DelegatorUserId, x.IsActive });
            e.HasIndex(x => new { x.StartDate, x.EndDate });
        });

        modelBuilder.Entity<RoleEntity>(e =>
        {
            e.ToTable("roles");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.Code).HasColumnName("code").HasColumnType("character varying(50)").HasMaxLength(50);
            e.Property(x => x.Name).HasColumnName("name").HasColumnType("character varying(150)").HasMaxLength(150);
            e.Property(x => x.Active).HasColumnName("active").HasColumnType("boolean");
            e.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<UserRoleEntity>(e =>
        {
            e.ToTable("user_roles");
            e.HasKey(x => new { x.UserId, x.RoleId });
            e.Property(x => x.UserId).HasColumnName("user_id").HasColumnType("uuid");
            e.Property(x => x.RoleId).HasColumnName("role_id").HasColumnType("uuid");
        });



        modelBuilder.Entity<FormTypeEntity>(e =>
        {
            e.ToTable("form_types");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.Code).HasColumnName("code").HasColumnType("character varying(50)").HasMaxLength(50);
            e.Property(x => x.Name).HasColumnName("name").HasColumnType("character varying(200)").HasMaxLength(200);
            e.Property(x => x.Description).HasColumnName("description").HasColumnType("text");
            e.Property(x => x.Active).HasColumnName("active").HasColumnType("boolean");
            e.Property(x => x.CreatedByUserId).HasColumnName("created_by_user_id").HasColumnType("uuid");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone");
            e.HasIndex(x => x.Code).IsUnique();
        });

        modelBuilder.Entity<FormSectionEntity>(e =>
        {
            e.ToTable("form_sections");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.FormTypeId).HasColumnName("form_type_id").HasColumnType("uuid");
            e.Property(x => x.Title).HasColumnName("title").HasColumnType("character varying(200)").HasMaxLength(200);
            e.Property(x => x.SortOrder).HasColumnName("sort_order").HasColumnType("integer");
            e.HasIndex(x => new { x.FormTypeId, x.SortOrder });
        });

        modelBuilder.Entity<FormFieldEntity>(e =>
        {
            e.ToTable("form_fields");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.FormTypeId).HasColumnName("form_type_id").HasColumnType("uuid");
            e.Property(x => x.SectionId).HasColumnName("section_id").HasColumnType("uuid");
            e.Property(x => x.FieldKey).HasColumnName("field_key").HasColumnType("character varying(100)").HasMaxLength(100);
            e.Property(x => x.Label).HasColumnName("label").HasColumnType("character varying(200)").HasMaxLength(200);
            e.Property(x => x.FieldType).HasColumnName("field_type").HasColumnType("smallint");
            e.Property(x => x.IsRequired).HasColumnName("is_required").HasColumnType("boolean");
            e.Property(x => x.Placeholder).HasColumnName("placeholder").HasColumnType("character varying(200)").HasMaxLength(200);
            e.Property(x => x.HelpText).HasColumnName("help_text").HasColumnType("text");
            e.Property(x => x.SortOrder).HasColumnName("sort_order").HasColumnType("integer");
            e.Property(x => x.DefaultValue).HasColumnName("default_value").HasColumnType("text");
            e.Property(x => x.VisibilityRuleJson).HasColumnName("visibility_rule_json").HasColumnType("jsonb");
            e.Property(x => x.ValidationRuleJson).HasColumnName("validation_rule_json").HasColumnType("jsonb");
            e.Property(x => x.OptionsJson).HasColumnName("options_json").HasColumnType("jsonb");
            e.Property(x => x.Active).HasColumnName("active").HasColumnType("boolean");
            e.HasIndex(x => new { x.FormTypeId, x.FieldKey }).IsUnique();
            e.HasIndex(x => new { x.FormTypeId, x.SortOrder });
        });

        modelBuilder.Entity<WorkflowDefinitionEntity>(e =>
        {
            e.ToTable("workflow_definitions");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.FormTypeId).HasColumnName("form_type_id").HasColumnType("uuid");
            e.Property(x => x.VersionNo).HasColumnName("version_no").HasColumnType("integer");
            e.Property(x => x.IsActive).HasColumnName("is_active").HasColumnType("boolean");
            e.HasIndex(x => new { x.FormTypeId, x.VersionNo }).IsUnique();
            e.HasIndex(x => new { x.FormTypeId, x.IsActive });
        });

        modelBuilder.Entity<WorkflowStepEntity>(e =>
        {
            e.ToTable("workflow_steps");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.WorkflowDefinitionId).HasColumnName("workflow_definition_id").HasColumnType("uuid");
            e.Property(x => x.StepNo).HasColumnName("step_no").HasColumnType("integer");
            e.Property(x => x.Name).HasColumnName("name").HasColumnType("character varying(150)").HasMaxLength(150);
            e.Property(x => x.AssigneeType).HasColumnName("assignee_type").HasColumnType("smallint");
            e.Property(x => x.AssigneeUserId).HasColumnName("assignee_user_id").HasColumnType("uuid");
            e.Property(x => x.AssigneeRoleId).HasColumnName("assignee_role_id").HasColumnType("uuid");
            e.Property(x => x.DynamicRuleJson).HasColumnName("dynamic_rule_json").HasColumnType("jsonb");
            e.Property(x => x.AllowReturnForRevision).HasColumnName("allow_return_for_revision").HasColumnType("boolean");
            e.Property(x => x.FallbackAction).HasColumnName("fallback_action").HasColumnType("smallint");
            e.Property(x => x.FallbackUserId).HasColumnName("fallback_user_id").HasColumnType("uuid");
            e.Property(x => x.IsParallel).HasColumnName("is_parallel").HasColumnType("boolean");
            e.HasIndex(x => new { x.WorkflowDefinitionId, x.StepNo }).IsUnique();
        });

        modelBuilder.Entity<FormRequestEntity>(e =>
        {
            e.ToTable("form_requests");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.FormTypeId).HasColumnName("form_type_id").HasColumnType("uuid");
            e.Property(x => x.RequestNo).HasColumnName("request_no").HasColumnType("character varying(50)").HasMaxLength(50);
            e.Property(x => x.RequestorUserId).HasColumnName("requestor_user_id").HasColumnType("uuid");
            e.Property(x => x.Status).HasColumnName("status").HasColumnType("smallint");
            e.Property(x => x.CurrentStepNo).HasColumnName("current_step_no").HasColumnType("integer");
            e.Property(x => x.ConcurrencyToken).HasColumnName("concurrency_token").HasColumnType("bigint");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone");
            e.Property(x => x.SubmittedAt).HasColumnName("submitted_at").HasColumnType("timestamp with time zone");
            e.Property(x => x.CompletedAt).HasColumnName("completed_at").HasColumnType("timestamp with time zone");
            e.HasIndex(x => x.RequestNo).IsUnique();
            e.HasIndex(x => new { x.RequestorUserId, x.CreatedAt });
            e.HasIndex(x => new { x.Status, x.CurrentStepNo });
        });

        modelBuilder.Entity<FormRequestValueEntity>(e =>
        {
            e.ToTable("form_request_values");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.RequestId).HasColumnName("request_id").HasColumnType("uuid");
            e.Property(x => x.FieldId).HasColumnName("field_id").HasColumnType("uuid");
            e.Property(x => x.FieldKey).HasColumnName("field_key").HasColumnType("character varying(100)").HasMaxLength(100);
            e.Property(x => x.ValueText).HasColumnName("value_text").HasColumnType("text");
            e.Property(x => x.ValueNumber).HasColumnName("value_number").HasColumnType("numeric(18,6)");
            e.Property(x => x.ValueDateTime).HasColumnName("value_datetime").HasColumnType("timestamp with time zone");
            e.Property(x => x.ValueBool).HasColumnName("value_bool").HasColumnType("boolean");
            e.Property(x => x.ValueJson).HasColumnName("value_json").HasColumnType("jsonb");
            e.HasIndex(x => new { x.RequestId, x.FieldId }).IsUnique();
            e.HasIndex(x => new { x.RequestId, x.FieldKey });
        });

        modelBuilder.Entity<FormRequestApprovalEntity>(e =>
        {
            e.ToTable("form_request_approvals");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.RequestId).HasColumnName("request_id").HasColumnType("uuid");
            e.Property(x => x.StepNo).HasColumnName("step_no").HasColumnType("integer");
            e.Property(x => x.WorkflowStepId).HasColumnName("workflow_step_id").HasColumnType("uuid");
            e.Property(x => x.Status).HasColumnName("status").HasColumnType("smallint");
            e.Property(x => x.AssigneeUserId).HasColumnName("assignee_user_id").HasColumnType("uuid");
            e.Property(x => x.AssigneeRoleId).HasColumnName("assignee_role_id").HasColumnType("uuid");
            e.Property(x => x.ActionByUserId).HasColumnName("action_by_user_id").HasColumnType("uuid");
            e.Property(x => x.ActionComment).HasColumnName("action_comment").HasColumnType("text");
            e.Property(x => x.ActionAt).HasColumnName("action_at").HasColumnType("timestamp with time zone");
            e.Property(x => x.ConcurrencyToken).HasColumnName("concurrency_token").HasColumnType("bigint");
            e.HasIndex(x => new { x.RequestId, x.StepNo });
            e.HasIndex(x => new { x.Status, x.AssigneeRoleId, x.AssigneeUserId });
        });

        modelBuilder.Entity<AuthorizationMatrixEntity>(e =>
        {
            e.ToTable("authorization_matrix");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.FormTypeId).HasColumnName("form_type_id").HasColumnType("uuid");
            e.Property(x => x.RoleId).HasColumnName("role_id").HasColumnType("uuid");
            e.Property(x => x.UserId).HasColumnName("user_id").HasColumnType("uuid");
            e.Property(x => x.CanCreate).HasColumnName("can_create").HasColumnType("boolean");
            e.Property(x => x.CanViewAll).HasColumnName("can_view_all").HasColumnType("boolean");
            e.Property(x => x.CanApprove).HasColumnName("can_approve").HasColumnType("boolean");
            e.HasIndex(x => new { x.FormTypeId, x.RoleId, x.UserId }).IsUnique();
        });

        modelBuilder.Entity<AuditLogEntity>(e =>
        {
            e.ToTable("audit_logs");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.EntityType).HasColumnName("entity_type").HasColumnType("character varying(100)").HasMaxLength(100);
            e.Property(x => x.EntityId).HasColumnName("entity_id").HasColumnType("uuid");
            e.Property(x => x.ActionType).HasColumnName("action_type").HasColumnType("character varying(80)").HasMaxLength(80);
            e.Property(x => x.ActorUserId).HasColumnName("actor_user_id").HasColumnType("uuid");
            e.Property(x => x.DetailJson).HasColumnName("detail_json").HasColumnType("jsonb");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone");
            e.HasIndex(x => new { x.EntityType, x.EntityId, x.CreatedAt });
        });

        modelBuilder.Entity<FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelAktarim>(e =>
        {
            e.ToTable("qdms_personeller");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.Sirket).HasColumnName("sirket").HasColumnType("character varying(50)").HasMaxLength(50);
            e.Property(x => x.Isyeri_Kodu).HasColumnName("isyeri_kodu").HasColumnType("character varying(50)").HasMaxLength(50);
            e.Property(x => x.Isyeri_Tanimi).HasColumnName("isyeri_tanimi").HasColumnType("character varying(150)").HasMaxLength(150);
            e.Property(x => x.Grup_Kodu).HasColumnName("grup_kodu").HasColumnType("character varying(50)").HasMaxLength(50);
            e.Property(x => x.Grup_Kodu_Aciklama).HasColumnName("grup_kodu_aciklama").HasColumnType("character varying(150)").HasMaxLength(150);
            e.Property(x => x.Sicil_No).HasColumnName("sicil_no").HasColumnType("character varying(50)").HasMaxLength(50);
            e.Property(x => x.Adi).HasColumnName("adi").HasColumnType("character varying(100)").HasMaxLength(100);
            e.Property(x => x.Soyadi).HasColumnName("soyadi").HasColumnType("character varying(100)").HasMaxLength(100);
            e.Property(x => x.Email).HasColumnName("email").HasColumnType("character varying(150)").HasMaxLength(150);
            e.Property(x => x.Pozisyon_Kodu).HasColumnName("pozisyon_kodu").HasColumnType("character varying(50)").HasMaxLength(50);
            e.Property(x => x.Pozisyon_Aciklamasi).HasColumnName("pozisyon_aciklamasi").HasColumnType("character varying(150)").HasMaxLength(150);
            e.Property(x => x.Ust_Pozisyon_Kodu).HasColumnName("ust_pozisyon_kodu").HasColumnType("character varying(50)").HasMaxLength(50);
            e.Property(x => x.Departman_Kodu).HasColumnName("departman_kodu").HasColumnType("character varying(50)").HasMaxLength(50);
            e.Property(x => x.Departman_Adi).HasColumnName("departman_adi").HasColumnType("character varying(150)").HasMaxLength(150);
            e.Property(x => x.LinkedUserId).HasColumnName("linked_user_id").HasColumnType("uuid");
            e.Property(x => x.IsActive).HasColumnName("is_active").HasColumnType("boolean");
            e.Property(x => x.LastSyncDate).HasColumnName("last_sync_date").HasColumnType("timestamp with time zone");

            e.HasIndex(x => x.Sicil_No).IsUnique();
            e.HasIndex(x => x.Pozisyon_Kodu);
            e.HasIndex(x => x.Ust_Pozisyon_Kodu);
            e.HasIndex(x => x.LinkedUserId);
        });

        modelBuilder.Entity<FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelSyncLog>(e =>
        {
            e.ToTable("qdms_personel_sync_logs");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.TriggeredByUserId).HasColumnName("triggered_by_user_id").HasColumnType("uuid");
            e.Property(x => x.StartTime).HasColumnName("start_time").HasColumnType("timestamp with time zone");
            e.Property(x => x.EndTime).HasColumnName("end_time").HasColumnType("timestamp with time zone");
            e.Property(x => x.InsertedCount).HasColumnName("inserted_count").HasColumnType("integer");
            e.Property(x => x.UpdatedCount).HasColumnName("updated_count").HasColumnType("integer");
            e.Property(x => x.DeactivatedCount).HasColumnName("deactivated_count").HasColumnType("integer");
            e.Property(x => x.ErrorsJson).HasColumnName("errors_json").HasColumnType("jsonb");
            
            e.HasIndex(x => x.StartTime);
        });

        modelBuilder.Entity<FormfleksBaseApp.Domain.Entities.Admin.HrAuthorization>(e =>
        {
            e.ToTable("hr_authorizations");
            e.HasKey(x => x.Id);
            e.Property(x => x.Id).HasColumnName("id").HasColumnType("uuid");
            e.Property(x => x.UserId).HasColumnName("user_id").HasColumnType("uuid");
            e.Property(x => x.IsGlobalManager).HasColumnName("is_global_manager").HasColumnType("boolean");
            e.Property(x => x.LocationName).HasColumnName("location_name").HasColumnType("character varying(150)").HasMaxLength(150);
            e.Property(x => x.Active).HasColumnName("active").HasColumnType("boolean");
            e.Property(x => x.CreatedAt).HasColumnName("created_at").HasColumnType("timestamp with time zone");
            e.Property(x => x.UpdatedAt).HasColumnName("updated_at").HasColumnType("timestamp with time zone");

            e.HasIndex(x => new { x.UserId, x.Active });
            e.HasIndex(x => new { x.LocationName, x.Active });
            e.HasIndex(x => x.IsGlobalManager);
        });
    }
}
