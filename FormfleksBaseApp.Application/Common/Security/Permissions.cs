namespace FormfleksBaseApp.Application.Common.Security;

/// <summary>
/// Sistemde kullanılabilecek tüm yetkilerin (Permissions) tanımlandığı sabit sınıf.
/// Veritabanındaki 'permissions' tablosundaki 'name' alanı ile birebir eşleşmelidir.
/// </summary>
public static class Permissions
{
    // === YÖNETİCİ & SİSTEM (ADMIN) ===
    public const string AdminUsers_View = "Admin.Users.View";
    public const string AdminUsers_Manage = "Admin.Users.Manage";
    public const string AdminRoles_View = "Admin.Roles.View";
    public const string AdminRoles_Manage = "Admin.Roles.Manage";
    public const string AdminSystemSettings_Manage = "Admin.SystemSettings.Manage";
    public const string AdminAuditLogs_View = "Admin.AuditLogs.View";

    // === İNSAN KAYNAKLARI (HR) ===
    public const string HrReports_View = "Hr.Reports.View";
    public const string HrPersonnel_Sync = "Hr.Personnel.Sync";

    // === FORMLAR & TASARIM ===
    public const string FormDesigner_View = "Forms.Designer.View";
    public const string FormDesigner_Manage = "Forms.Designer.Manage";
    public const string WorkflowDesigner_Manage = "Forms.Workflow.Manage";

    // === FORMLAR KULLANICI İŞLEMLERİ ===
    public const string Forms_Create = "Forms.Request.Create";
    public const string Forms_Approve = "Forms.Request.Approve";

    // İleride eklenebilecek modüller buraya eklenebilir.
}
