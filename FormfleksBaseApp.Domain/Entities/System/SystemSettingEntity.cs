using FormfleksBaseApp.Domain.Common;
using System.ComponentModel.DataAnnotations.Schema;

namespace FormfleksBaseApp.Domain.Entities.System;

/// <summary>
/// Sistem ayarlarını (JSON formatında) dinamik olarak veritabanında tutan entity.
/// </summary>
[Table("system_settings", Schema = "public")]
public class SystemSettingEntity
{
    /// <summary>
    /// Ayarın benzersiz anahtarı (örn: "Jwt", "EmailSettings", "WorkflowRules")
    /// </summary>
    public string Id { get; set; } = default!;

    /// <summary>
    /// Ayarın JSON formatındaki değeri.
    /// </summary>
    public string Value { get; set; } = string.Empty;

    /// <summary>
    /// Ayarın son güncellenme tarihi (UTC).
    /// </summary>
    public DateTime UpdatedAt { get; set; } = DateTime.UtcNow;
}
