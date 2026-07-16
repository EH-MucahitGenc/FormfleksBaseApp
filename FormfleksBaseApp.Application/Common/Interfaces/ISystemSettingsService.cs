using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Common.Interfaces;

/// <summary>
/// Sistem ayarlarını (Appsettings veya Veritabanı tabanlı) okumak ve güncellemek için kullanılan servis arayüzü.
/// </summary>
public interface ISystemSettingsService
{
    Task<T?> GetSettingAsync<T>(string key, T? defaultValue = default, CancellationToken ct = default);
    Task UpdateSettingAsync<T>(string key, T value, CancellationToken ct = default);
    
    T? GetSetting<T>(string key, T? defaultValue = default);
    void UpdateSetting<T>(string key, T value);
}
