using FormfleksBaseApp.Domain.Entities.DynamicForms;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IDynamicFormsDbContext
{
    DbSet<RoleEntity> Roles { get; }
    DbSet<UserRoleEntity> UserRoles { get; }

    DbSet<FormTypeEntity> FormTypes { get; }
    DbSet<FormSectionEntity> FormSections { get; }
    DbSet<FormFieldEntity> FormFields { get; }
    DbSet<WorkflowDefinitionEntity> WorkflowDefinitions { get; }
    DbSet<WorkflowStepEntity> WorkflowSteps { get; }
    DbSet<FormRequestEntity> FormRequests { get; }
    DbSet<FormRequestValueEntity> FormRequestValues { get; }
    DbSet<FormRequestApprovalEntity> FormRequestApprovals { get; }
    DbSet<FormRequestManualAssignmentEntity> FormRequestManualAssignments { get; }
    DbSet<AuditLogEntity> AuditLogs { get; }
    DbSet<FormfleksBaseApp.Domain.Entities.System.AppNotificationEntity> AppNotifications { get; }
    DbSet<FormfleksBaseApp.Domain.Entities.System.SystemSettingEntity> SystemSettings { get; }
    
    DbSet<FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelAktarim> QdmsPersoneller { get; }
    DbSet<FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelSyncLog> QdmsPersonelSyncLogs { get; }
    DbSet<UserDelegationEntity> UserDelegations { get; }
    DbSet<UserLocationRoleEntity> UserLocationRoles { get; }
    DbSet<IntegrationQueryEntity> IntegrationQueries { get; }
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
    int SaveChanges();
}
