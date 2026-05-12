using FormfleksBaseApp.Application.Features.Admin.Commands.DeleteHrAuthorization;
using FormfleksBaseApp.Application.Features.Admin.Commands.SetHrAuthorizations;
using FormfleksBaseApp.Application.Features.Admin.Queries.GetDistinctLocations;
using FormfleksBaseApp.Application.Features.Admin.Queries.GetHrAuthorizations;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/hr-authorizations")]
// [Authorize(Roles = "Admin")] // Uncomment if there is an Admin role required
public class HrAuthorizationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public HrAuthorizationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    public async Task<ActionResult<List<HrAuthorizationDto>>> Get()
    {
        var result = await _mediator.Send(new GetHrAuthorizationsQuery());
        return Ok(result);
    }

    [HttpGet("locations")]
    public async Task<ActionResult<List<string>>> GetLocations()
    {
        var result = await _mediator.Send(new GetDistinctLocationsQuery());
        return Ok(result);
    }

    [HttpPost]
    public async Task<ActionResult<bool>> Set([FromBody] SetHrAuthorizationsCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpDelete]
    public async Task<ActionResult<bool>> Delete([FromBody] DeleteHrAuthorizationCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(result);
    }
}
