using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.System;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using Microsoft.Extensions.DependencyInjection;
using Microsoft.Extensions.Logging;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Infrastructure.Services;

public class SystemSettingsService : ISystemSettingsService
{
    private readonly IServiceScopeFactory _scopeFactory;
    private readonly IMemoryCache _cache;
    private readonly ILogger<SystemSettingsService> _logger;

    public SystemSettingsService(IServiceScopeFactory scopeFactory, IMemoryCache cache, ILogger<SystemSettingsService> logger)
    {
        _scopeFactory = scopeFactory;
        _cache = cache;
        _logger = logger;
    }

    public async Task<T?> GetSettingAsync<T>(string key, T? defaultValue = default, CancellationToken ct = default)
    {
        string cacheKey = $"SystemSetting_{key}";

        if (_cache.TryGetValue(cacheKey, out T? cachedValue))
        {
            return cachedValue;
        }

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IDynamicFormsDbContext>();

        var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Id == key, ct);

        if (setting == null || string.IsNullOrWhiteSpace(setting.Value))
        {
            _logger.LogInformation("Setting {Key} not found in database. Using default value.", key);
            
            // Eğer default value null değilse, veritabanına varsayılanı kaydedelim ki UI'da gözüksün.
            if (defaultValue != null)
            {
                await UpdateSettingAsync(key, defaultValue, ct);
            }
            
            return defaultValue;
        }

        try
        {
            var value = JsonSerializer.Deserialize<T>(setting.Value, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            
            // 1 saat cache'de tut.
            _cache.Set(cacheKey, value, TimeSpan.FromHours(1));
            return value;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Error parsing setting {Key}. Value was: {Value}", key, setting.Value);
            return defaultValue;
        }
    }

    public async Task UpdateSettingAsync<T>(string key, T value, CancellationToken ct = default)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IDynamicFormsDbContext>();

        var jsonValue = JsonSerializer.Serialize(value);

        var setting = await db.SystemSettings.FirstOrDefaultAsync(s => s.Id == key, ct);
        if (setting == null)
        {
            setting = new SystemSettingEntity
            {
                Id = key,
                Value = jsonValue,
                UpdatedAt = DateTime.UtcNow
            };
            db.SystemSettings.Add(setting);
        }
        else
        {
            setting.Value = jsonValue;
            setting.UpdatedAt = DateTime.UtcNow;
            db.SystemSettings.Update(setting);
        }

        await db.SaveChangesAsync(ct);

        // Cache'i temizle
        string cacheKey = $"SystemSetting_{key}";
        _cache.Remove(cacheKey);

        _logger.LogInformation("System setting {Key} updated successfully.", key);
    }

    public T? GetSetting<T>(string key, T? defaultValue = default)
    {
        string cacheKey = $"SystemSetting_{key}";

        if (_cache.TryGetValue(cacheKey, out T? cachedValue))
        {
            return cachedValue;
        }

        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IDynamicFormsDbContext>();

        var setting = db.SystemSettings.FirstOrDefault(s => s.Id == key);

        if (setting == null || string.IsNullOrWhiteSpace(setting.Value))
        {
            _logger.LogInformation("Setting {Key} not found in database. Using default value.", key);
            
            if (defaultValue != null)
            {
                UpdateSetting(key, defaultValue);
            }
            
            return defaultValue;
        }

        try
        {
            var value = JsonSerializer.Deserialize<T>(setting.Value, new JsonSerializerOptions { PropertyNameCaseInsensitive = true });
            _cache.Set(cacheKey, value, TimeSpan.FromHours(1));
            return value;
        }
        catch (JsonException ex)
        {
            _logger.LogError(ex, "Error parsing setting {Key}. Value was: {Value}", key, setting.Value);
            return defaultValue;
        }
    }

    public void UpdateSetting<T>(string key, T value)
    {
        using var scope = _scopeFactory.CreateScope();
        var db = scope.ServiceProvider.GetRequiredService<IDynamicFormsDbContext>();

        var jsonValue = JsonSerializer.Serialize(value);

        var setting = db.SystemSettings.FirstOrDefault(s => s.Id == key);
        if (setting == null)
        {
            setting = new SystemSettingEntity
            {
                Id = key,
                Value = jsonValue,
                UpdatedAt = DateTime.UtcNow
            };
            db.SystemSettings.Add(setting);
        }
        else
        {
            setting.Value = jsonValue;
            setting.UpdatedAt = DateTime.UtcNow;
            db.SystemSettings.Update(setting);
        }

        db.SaveChanges();

        string cacheKey = $"SystemSetting_{key}";
        _cache.Remove(cacheKey);

        _logger.LogInformation("System setting {Key} updated successfully.", key);
    }
}
