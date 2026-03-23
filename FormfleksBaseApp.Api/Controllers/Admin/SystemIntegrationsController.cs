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

[ApiController]
[Route("api/admin/integrations")]
[Authorize(Policy = "AdminOnly")]
public class SystemIntegrationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public SystemIntegrationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("sync-personnel")]
    public async Task<IActionResult> SyncPersonnel()
    {
        var result = await _mediator.Send(new SyncQdmsPersonelCommand());
        if (result.Success)
            return Ok(new { message = result.Message });

        return BadRequest(new { error = result.Message });
    }

    [HttpGet("personnel-stats")]
    public async Task<IActionResult> GetPersonnelStats()
    {
        var result = await _mediator.Send(new GetPersonnelStatsQuery());
        return Ok(result);
    }

    [HttpGet("sync-logs")]
    public async Task<IActionResult> GetSyncLogs([FromQuery] int page = 1, [FromQuery] int pageSize = 10)
    {
        var result = await _mediator.Send(new GetSyncLogsQuery { Page = page, PageSize = pageSize });
        return Ok(result);
    }

    [HttpGet("personnel")]
    public async Task<IActionResult> GetPersonnel([FromQuery] GetPersonnelsQuery query)
    {
        var result = await _mediator.Send(query);
        return Ok(result);
    }
}
