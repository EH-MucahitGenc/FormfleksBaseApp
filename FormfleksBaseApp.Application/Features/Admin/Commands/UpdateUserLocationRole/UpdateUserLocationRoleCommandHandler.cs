using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Admin.Commands.UpdateUserLocationRole;

public class UpdateUserLocationRoleCommandHandler : IRequestHandler<UpdateUserLocationRoleCommand, bool>
{
    private readonly IDynamicFormsDbContext _db;

    public UpdateUserLocationRoleCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<bool> Handle(UpdateUserLocationRoleCommand request, CancellationToken ct)
    {
        var existing = await _db.UserLocationRoles.FirstOrDefaultAsync(x => x.Id == request.Id, ct);
        if (existing == null) throw new BusinessException("Kayıt bulunamadı.");

        if (request.IsGlobalManager)
        {
            if (await _db.UserLocationRoles.AnyAsync(x => x.UserId == existing.UserId && x.RoleId == existing.RoleId && x.IsGlobalManager && x.Id != request.Id, ct))
                throw new BusinessException("Bu kullanıcı için bu rolde zaten Global (Tüm Şubeler) yetkisi bulunmaktadır.");
            
            existing.LocationName = null;
            existing.IsGlobalManager = true;
        }
        else
        {
            if (string.IsNullOrWhiteSpace(request.LocationName))
                throw new BusinessException("Lokasyon adı belirtilmelidir.");

            if (await _db.UserLocationRoles.AnyAsync(x => x.UserId == existing.UserId && x.RoleId == existing.RoleId && x.LocationName == request.LocationName && x.Id != request.Id, ct))
                throw new BusinessException($"Bu kullanıcı için bu rolde '{request.LocationName}' şubesine ait yetki zaten bulunmaktadır.");
            
            existing.LocationName = request.LocationName;
            existing.IsGlobalManager = false;
        }

        existing.IsActive = request.IsActive;
        await _db.SaveChangesAsync(ct);
        return true;
    }
}
