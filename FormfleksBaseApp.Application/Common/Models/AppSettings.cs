namespace FormfleksBaseApp.Application.Common.Models;

public class AppSettings
{
    public string SiteName { get; set; } = "Formfleks Kurumsal";
    public string SiteUrl { get; set; } = "http://localhost:3001";
    public string SupportEmail { get; set; } = string.Empty;
    public int MaxUploadSizeMb { get; set; } = 25;
    public string AllowedFileTypes { get; set; } = ".pdf,.doc,.docx,.xls,.xlsx,.png,.jpg";
    public bool EnableUserRegistration { get; set; } = false;
    public bool MaintenanceMode { get; set; } = false;
}
