using System.Collections.Generic;

namespace FormfleksBaseApp.Domain.Constants;

public static class AppPermissions
{
    // Permission Names
    public const string FormsDesign = "Forms.Design";
    public const string WorkflowsManage = "Workflows.Manage";
    public const string ReportsView = "Reports.View";
    public const string UsersManage = "Users.Manage";
    public const string RolesManage = "Roles.Manage";
    public const string SystemSettings = "System.Settings";
    public const string SystemAuditLogs = "System.AuditLogs";
    public const string PersonnelSync = "Personnel.Sync";
    
    // Survey Permissions
    public const string SurveysDesign = "Surveys.Design";
    public const string SurveysPublish = "Surveys.Publish";
    public const string SurveysManage = "Surveys.Manage";
    public const string SurveysResultsExport = "Surveys.Results.Export";
    public const string SurveysResultsExportIdentified = "Surveys.Results.ExportIdentified";
    public const string SurveysResultsViewFiles = "Surveys.Results.ViewFiles";

    // Policy Names for Authorize Attributes
    public const string PolicyFormsDesign = "Permission:" + FormsDesign;
    public const string PolicyWorkflowsManage = "Permission:" + WorkflowsManage;
    public const string PolicyReportsView = "Permission:" + ReportsView;
    public const string PolicyUsersManage = "Permission:" + UsersManage;
    public const string PolicyRolesManage = "Permission:" + RolesManage;
    public const string PolicySystemSettings = "Permission:" + SystemSettings;
    public const string PolicySystemAuditLogs = "Permission:" + SystemAuditLogs;
    public const string PolicyPersonnelSync = "Permission:" + PersonnelSync;

    // Survey Policy Names
    public const string PolicySurveysDesign = "Permission:" + SurveysDesign;
    public const string PolicySurveysPublish = "Permission:" + SurveysPublish;
    public const string PolicySurveysManage = "Permission:" + SurveysManage;
    public const string PolicySurveysResultsExport = "Permission:" + SurveysResultsExport;

    public static readonly IReadOnlyList<(string Name, string Description)> All = new List<(string, string)>
    {
        (FormsDesign, "Form Tasarımcısına erişim sağlar."),
        (WorkflowsManage, "Onay Rotalarını yönetme izni."),
        (ReportsView, "İK ve Sistem Raporlarını görüntüleme izni."),
        (UsersManage, "Kullanıcıları yönetme izni."),
        (RolesManage, "Rolleri ve Yetkileri yönetme izni."),
        (SystemSettings, "Sistem ayarlarını değiştirme izni."),
        (SystemAuditLogs, "Sistem loglarını görüntüleme izni."),
        (PersonnelSync, "IK Personel senkronizasyonunu başlatma izni."),
        (SurveysDesign, "Anket şablonu oluşturma ve düzenleme izni."),
        (SurveysPublish, "Anket kampanyası hazırlama ve yayınlama izni."),
        (SurveysManage, "Kampanya, katılımcı, e-posta ve sonuç izleyicisi atamalarını yönetir; tüm yanıtları okuma yetkisi vermez."),
        (SurveysResultsExport, "Erişimi bulunan kampanyaların özet sonuçlarını CSV olarak dışa aktarır."),
        (SurveysResultsExportIdentified, "Detaylı izleyici olduğu kimlikli kampanyalarda kişisel yanıtları dışa aktarır. Özet dışa aktarma izni de gereklidir."),
        (SurveysResultsViewFiles, "Detaylı izleyici olduğu kampanyalardaki yanıt dosyalarını görüntüler. Anonimlik kontrollerini kaldırmaz.")
    };
}
