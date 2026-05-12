using FormfleksBaseApp.Domain.Entities.DynamicForms;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IDynamicFormsDbContext
{
    DbSet<RoleEntity> Roles { get; }
    DbSet<UserRoleEntity> UserRoles { get; }
    DbSet<DepartmentEntity> Departments { get; }
    DbSet<UserDepartmentEntity> UserDepartments { get; }
    DbSet<FormTypeEntity> FormTypes { get; }
    DbSet<FormSectionEntity> FormSections { get; }
    DbSet<FormFieldEntity> FormFields { get; }
    DbSet<WorkflowDefinitionEntity> WorkflowDefinitions { get; }
    DbSet<WorkflowStepEntity> WorkflowSteps { get; }
    DbSet<FormRequestEntity> FormRequests { get; }
    DbSet<FormRequestValueEntity> FormRequestValues { get; }
    DbSet<FormRequestApprovalEntity> FormRequestApprovals { get; }
    DbSet<AuthorizationMatrixEntity> AuthorizationMatrix { get; }
    DbSet<AuditLogEntity> AuditLogs { get; }
    
    DbSet<FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelAktarim> QdmsPersoneller { get; }
    DbSet<FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelSyncLog> QdmsPersonelSyncLogs { get; }
    DbSet<UserDelegationEntity> UserDelegations { get; }
    DbSet<FormfleksBaseApp.Domain.Entities.Admin.HrAuthorization> HrAuthorizations { get; }
    
    Task<int> SaveChangesAsync(CancellationToken cancellationToken);
}
