using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.CreateCampaign;
using FormfleksBaseApp.Application.Features.Surveys.Participants.Queries.SearchParticipants;
using FormfleksBaseApp.Domain.Constants;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Api.Controllers.Admin;

[ApiController]
[Route("api/admin/surveys/campaigns")]
public class CampaignsController : ControllerBase
{
    private readonly IMediator _mediator;

    public CampaignsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("participants/search")]
    [Authorize(Policy = AppPermissions.PolicySurveysPublish)]
    public async Task<IActionResult> SearchParticipants([FromQuery] string query)
    {
        var result = await _mediator.Send(new SearchParticipantsQuery(query));
        return Ok(result);
    }

    [HttpGet]
    [Authorize(Policy = AppPermissions.PolicySurveysManage)]
    public async Task<IActionResult> GetCampaigns()
    {
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaigns.GetCampaignsQuery());
        return Ok(result);
    }

    [HttpGet("my-viewable")]
    [Authorize]
    public async Task<IActionResult> GetMyViewableCampaigns()
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetMyViewableCampaigns.GetMyViewableCampaignsQuery(userId));
        return Ok(result);
    }

    [HttpPost]
    [Authorize(Policy = AppPermissions.PolicySurveysPublish)]
    public async Task<IActionResult> CreateCampaign([FromBody] CreateCampaignCommand command)
    {
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(CreateCampaign), new { id }, new { id }); // Temp return URL for now
    }

    [HttpPut("{id:guid}/status")]
    [Authorize(Policy = AppPermissions.PolicySurveysPublish)]
    public async Task<IActionResult> UpdateCampaignStatus(Guid id, [FromBody] FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.UpdateCampaignStatus.UpdateCampaignStatusCommand command)
    {
        if (id != command.CampaignId) return BadRequest();
        var result = await _mediator.Send(command);
        return Ok(result);
    }

    [HttpGet("{id:guid}/participants")]
    [Authorize(Policy = AppPermissions.PolicySurveysManage)]
    public async Task<IActionResult> GetCampaignParticipants(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromQuery] string? search = null, [FromQuery] string? status = null)
    {
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignParticipants.GetCampaignParticipantsQuery(id, page, pageSize, search, status));
        return Ok(result);
    }

    [HttpPost("participants/{assignmentId:guid}/resend")]
    [Authorize(Policy = AppPermissions.PolicySurveysManage)]
    public async Task<IActionResult> ResendAssignmentEmail(Guid assignmentId)
    {
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.ResendAssignmentEmail.ResendAssignmentEmailCommand(assignmentId));
        return Ok(result);
    }

    [HttpGet("{id:guid}/export")]
    [Authorize(Policy = AppPermissions.PolicySurveysResultsExport)]
    public async Task<IActionResult> ExportCampaignResults(Guid id)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        // Since we have the policy, they are already verified to have the permission.
        bool isGlobalAdmin = true; 
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.ExportCampaignResultsCsv.ExportCampaignResultsCsvQuery(id, userId, isGlobalAdmin));
        return File(result, "text/csv", $"Anket_Sonuclari_{id}.csv");
    }

    [HttpGet("{id:guid}/results")]
    [Authorize]
    public async Task<IActionResult> GetCampaignResults(System.Guid id)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        bool isGlobalAdmin = User.HasClaim(c => c.Type == "Permission" && c.Value == AppPermissions.SurveysResultsView);
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignResults.GetCampaignResultsQuery(id, userId, isGlobalAdmin));
        return Ok(result);
    }

    [HttpGet("{id:guid}/participant-response")]
    [Authorize]
    public async Task<IActionResult> GetParticipantResponse(Guid id, [FromQuery] Guid? assignmentId, [FromQuery] string? receiptCode)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        bool isGlobalAdmin = User.HasClaim(c => c.Type == "Permission" && c.Value == AppPermissions.SurveysResultsView);
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetParticipantResponse.GetParticipantResponseQuery(id, assignmentId, receiptCode, userId, isGlobalAdmin));
        return Ok(result);
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var sub = claim?.Value;
        return Guid.TryParse(sub, out userId);
    }
}
