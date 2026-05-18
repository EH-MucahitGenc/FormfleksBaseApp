using System;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Features.AppNotifications.Commands.MarkNotificationAsRead;
using FormfleksBaseApp.Application.Features.AppNotifications.Queries.GetMyNotifications;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FormfleksBaseApp.Api.Controllers;

[Authorize]
[ApiController]
[Route("api/[controller]")]
public class NotificationsController : ControllerBase
{
    private readonly IMediator _mediator;

    public NotificationsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("my")]
    public async Task<IActionResult> GetMyNotifications([FromQuery] int limit = 20)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();

        var result = await _mediator.Send(new GetMyNotificationsQuery(userId) { Limit = limit });
        return Ok(result);
    }

    [HttpPost("{id:guid}/read")]
    public async Task<IActionResult> MarkAsRead(Guid id)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();

        var result = await _mediator.Send(new MarkNotificationAsReadCommand(id, userId));
        return Ok(new { success = result });
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        var sub = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out userId);
    }
}
