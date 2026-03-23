namespace FormfleksBaseApp.DynamicForms.Domain.Enums;

public enum WorkflowAssigneeType : short
{
    User = 1,
    RoleGroup = 2,
    DynamicRule = 3, // Legacy or Custom JSON Rules
    
    // Enterprise Organizational Roles
    DirectManager = 10,
    DepartmentManager = 11,
    SectionLeader = 12,
    UpperManager = 13
}

public enum WorkflowFallbackAction : short
{
    Skip = 0,
    FallToUpperManager = 1,
    FallToFixedUser = 2,
    FallToRoleGroup = 3
}
