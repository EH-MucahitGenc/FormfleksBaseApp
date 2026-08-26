using FormfleksBaseApp.Application.Features.Surveys.SavedAudiences.Commands.CreateSavedAudience;
using FormfleksBaseApp.Application.Features.Surveys.SavedAudiences.Commands.DeleteSavedAudience;
using FormfleksBaseApp.Application.Features.Surveys.SavedAudiences.Queries.GetSavedAudiences;
using FormfleksBaseApp.Domain.Constants;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FormfleksBaseApp.Api.Controllers.Admin;

[ApiController]
[Authorize]
[Route("api/admin/surveys/saved-audiences")]
public class SavedAudiencesController : ControllerBase
{
    private readonly IMediator _mediator;

    public SavedAudiencesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet]
    [Authorize(Policy = AppPermissions.PolicySurveysPublish)]
    public async Task<IActionResult> GetSavedAudiences()
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var result = await _mediator.Send(new GetSavedAudiencesQuery(userId));
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.PolicySurveysPublish)]
    public async Task<IActionResult> CreateSavedAudience([FromBody] CreateSavedAudienceCommand command)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var cmdWithUser = command with { UserId = userId };
        var id = await _mediator.Send(cmdWithUser);
        return Ok(new { id });
    }

    [HttpDelete("{id}")]
    [Authorize(Policy = AppPermissions.PolicySurveysPublish)]
    public async Task<IActionResult> DeleteSavedAudience(Guid id)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        await _mediator.Send(new DeleteSavedAudienceCommand(id, userId));
        return NoContent();
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var sub = claim?.Value;
        return Guid.TryParse(sub, out userId);
    }
}
