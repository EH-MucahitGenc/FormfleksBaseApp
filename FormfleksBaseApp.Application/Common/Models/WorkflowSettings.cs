namespace FormfleksBaseApp.Application.Common.Models;

public class WorkflowSettings
{
    /// <summary>
    /// Sistemin kaç saatte bir hatırlatmaları kontrol edeceği (Örn: 12)
    /// </summary>
    public int ReminderCheckIntervalHours { get; set; } = 12;

    /// <summary>
    /// Bir onayın "gecikmiş" sayılması için beklemesi gereken saat (Örn: 24)
    /// </summary>
    public int PendingApprovalThresholdHours { get; set; } = 24;
}
