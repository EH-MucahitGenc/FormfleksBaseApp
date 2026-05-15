using System.Threading.Tasks;
using FormfleksBaseApp.Application.Features.Admin.Commands.SyncQdmsPersonel;
using FormfleksBaseApp.Application.Features.Admin.Queries.GetPersonnels;
using FormfleksBaseApp.Application.Features.Admin.Queries.GetPersonnelStats;
using FormfleksBaseApp.Application.Features.Admin.Queries.GetSyncLogs;
using MediatR;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FormfleksBaseApp.Api.Controllers.Admin;

/// <summary>
/// QDMS gibi dış sistemlerle olan entegrasyon işlemlerini ve manuel senkronizasyonları yöneten API.
/// </summary>
[ApiController]
[Route("api/admin/integrations")]
[Authorize(Policy = FormfleksBaseApp.Domain.Constants.AppPermissions.PolicyPersonnelSync)]
public class SystemIntegrationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SystemIntegrationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// QDMS Oracle sisteminden personel verilerini çekerek PostgreSQL'e manuel senkronize eder.
    /// </summary>
    [HttpPost("sync-personnel")]
    public async Task<IActionResult> SyncPersonnel()
    {
        var result = await _mediator.Send(new SyncQdmsPersonelCommand());
        if (result.Success)
            return Ok(new { message = result.Message });

        return BadRequest(new { error = result.Message });
    }

    /// <summary>
    /// Senkronize edilen personellerin departman ve unvan bazlı istatistiklerini getirir.
    /// </summary>
    [HttpGet("personnel-stats")]
    public async Task<IActionResult> GetPersonnelStats()
    {
        var result = await _mediator.Send(new GetPersonnelStatsQuery());
        return Ok(result);
    }

    /// <summary>
    /// Geçmiş senkronizasyon işlemlerinin loglarını (başarı, hata, senkronize edilen kayıt sayısı) listeler.
    /// </summary>
    [HttpGet("sync-logs")]
    public async Task<IActionResult> GetSyncLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetSyncLogsQuery { Page = page, PageSize = pageSize });
        return Ok(result);
    }

    /// <summary>
    /// Senkronize edilmiş personelleri sayfalayarak listeler.
    /// </summary>
    [HttpGet("personnel")]
    public async Task<IActionResult> GetPersonnel([FromQuery] GetPersonnelsQuery query)
    {
        var result = await _mediator.Send(query);
        return Ok(result);
    }
}
