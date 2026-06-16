namespace FormfleksBaseApp.Application.Common.Models;

public class WorkflowSettings
{
    /// <summary>
    /// Sistemin gecikmiş onaylar için hatırlatma kontrolünü yapacağı saatler (Örn: "10:00", "10:00,15:00")
    /// </summary>
    public string ApprovalReminderTime { get; set; } = "10:00,15:00";

    /// <summary>
    /// Bir onayın "gecikmiş" sayılması için beklemesi gereken saat (Örn: 24)
    /// </summary>
    public int PendingApprovalThresholdHours { get; set; } = 24;

    /// <summary>
    /// Sistemin taslak (draft) formlar için hatırlatma kontrolünü yapacağı saat (Örn: "09:00")
    /// </summary>
    public string DraftReminderTime { get; set; } = "09:00";

    /// <summary>
    /// Taslak formların oluşturulduğu tarihten itibaren kaç gün sonra otomatik olarak silineceği (Örn: 7)
    /// </summary>
    public int DraftAutoDeleteThresholdDays { get; set; } = 7;
}
