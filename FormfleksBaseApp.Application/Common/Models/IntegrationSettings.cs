namespace FormfleksBaseApp.Application.Common.Models;

public class IntegrationSettings
{
    /// <summary>
    /// Personel Senkronizasyonu çalışma saati (Örn: "02:00")
    /// </summary>
    public string PersonnelSyncTime { get; set; } = "02:00";

    /// <summary>
    /// Personel Senkronizasyonu başarısız olursa uyarı gönderilecek e-posta adresleri (virgülle ayırarak birden fazla girilebilir)
    /// </summary>
    public string PersonnelSyncErrorEmail { get; set; } = "";
}
