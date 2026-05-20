using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.System;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Caching.Memory;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.AdminSystem.Commands.UpdateSystemSetting;

public class UpdateSystemSettingCommand : IRequest<bool>
{
    public string Key { get; set; } = default!;
    
    /// <summary>
    /// Frontend'den gelen ham JSON string verisi.
    /// </summary>
    public string JsonValue { get; set; } = default!;
}

public class UpdateSystemSettingCommandHandler : IRequestHandler<UpdateSystemSettingCommand, bool>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IMemoryCache _cache;

    public UpdateSystemSettingCommandHandler(IDynamicFormsDbContext db, IMemoryCache cache)
    {
        _db = db;
        _cache = cache;
    }

    public async Task<bool> Handle(UpdateSystemSettingCommand request, CancellationToken cancellationToken)
    {
        var setting = await _db.SystemSettings.FirstOrDefaultAsync(x => x.Id == request.Key, cancellationToken);
        
        if (setting == null)
        {
            setting = new SystemSettingEntity
            {
                Id = request.Key,
                Value = request.JsonValue,
                UpdatedAt = DateTime.UtcNow
            };
            _db.SystemSettings.Add(setting);
        }
        else
        {
            setting.Value = request.JsonValue;
            setting.UpdatedAt = DateTime.UtcNow;
            _db.SystemSettings.Update(setting);
        }

        await _db.SaveChangesAsync(cancellationToken);

        // İlgili key için cache'i temizle
        string cacheKey = $"SystemSetting_{request.Key}";
        _cache.Remove(cacheKey);

        return true;
    }
}
