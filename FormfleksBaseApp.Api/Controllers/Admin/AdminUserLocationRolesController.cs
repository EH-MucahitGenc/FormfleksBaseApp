using FormfleksBaseApp.Application.Features.Admin.Commands.CreateUserLocationRole;
using FormfleksBaseApp.Application.Features.Admin.Commands.DeleteUserLocationRole;
using FormfleksBaseApp.Application.Features.Admin.Commands.UpdateUserLocationRole;
using FormfleksBaseApp.Application.Features.Admin.Queries.GetUserLocationRoles;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Api.Controllers.Admin;

[Authorize(Roles = "Admin")]
[Route("api/admin/user-location-roles")]
[ApiController]
public class AdminUserLocationRolesController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdminUserLocationRolesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("distinct-locations")]
    public async Task<IActionResult> GetDistinctLocations()
    {
        var result = await _mediator.Send(new Application.Features.Admin.Queries.GetDistinctLocations.GetDistinctLocationsQuery());
        return Ok(result);
    }

    [HttpGet]
    public async Task<IActionResult> GetAll()
    {
        var result = await _mediator.Send(new GetUserLocationRolesQuery());
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> Create([FromBody] CreateUserLocationRoleCommand command)
    {
        var id = await _mediator.Send(command);
        return Ok(new { Id = id });
    }

    [HttpPut("{id}")]
    public async Task<IActionResult> Update(Guid id, [FromBody] UpdateUserLocationRoleCommand command)
    {
        if (id != command.Id) return BadRequest();
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpDelete("{id}")]
    public async Task<IActionResult> Delete(Guid id)
    {
        var result = await _mediator.Send(new DeleteUserLocationRoleCommand { Id = id });
        if (!result) return NotFound();
        return NoContent();
    }
}
