using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.AdminSystem.Queries.GetSystemSetting;

public class GetSystemSettingQuery : IRequest<string>
{
    public string Key { get; set; } = default!;
}

public class GetSystemSettingQueryHandler : IRequestHandler<GetSystemSettingQuery, string>
{
    private readonly IDynamicFormsDbContext _db;

    public GetSystemSettingQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<string> Handle(GetSystemSettingQuery request, CancellationToken cancellationToken)
    {
        var setting = await _db.SystemSettings.FirstOrDefaultAsync(x => x.Id == request.Key, cancellationToken);
        return setting?.Value ?? "{}"; // Return empty json object if not found
    }
}
