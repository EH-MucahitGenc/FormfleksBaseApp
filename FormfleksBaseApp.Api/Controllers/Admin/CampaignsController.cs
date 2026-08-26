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

    [HttpGet("participants/facets")]
    [Authorize(Policy = AppPermissions.PolicySurveysPublish)]
    public async Task<IActionResult> GetParticipantFacets()
    {
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Participants.Queries.GetParticipantFacets.GetParticipantFacetsQuery());
        return Ok(result);
    }

    [HttpPost("participants/search")]
    [Authorize(Policy = AppPermissions.PolicySurveysPublish)]
    public async Task<IActionResult> SearchParticipants([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromBody] FormfleksBaseApp.Application.Features.Surveys.Common.AudienceFilter filter = null)
    {
        filter ??= new FormfleksBaseApp.Application.Features.Surveys.Common.AudienceFilter();
        var result = await _mediator.Send(new SearchParticipantsQuery(filter, page, pageSize));
        return Ok(result);
    }

    [HttpPost("participants/preview")]
    [Authorize(Policy = AppPermissions.PolicySurveysPublish)]
    public async Task<IActionResult> PreviewParticipants([FromQuery] int page = 1, [FromQuery] int pageSize = 10, [FromBody] FormfleksBaseApp.Application.Features.Surveys.Common.AudienceFilter filter = null)
    {
        filter ??= new FormfleksBaseApp.Application.Features.Surveys.Common.AudienceFilter();
        var result = await _mediator.Send(new SearchParticipantsQuery(filter, page, pageSize));
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
    public async Task<IActionResult> GetCampaignParticipants(Guid id, [FromQuery] int page = 1, [FromQuery] int pageSize = 25,
        [FromQuery] string? search = null, [FromQuery] string? status = null,
        [FromQuery] string? department = null, [FromQuery] string? location = null)
    {
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignParticipants.GetCampaignParticipantsQuery(
            id, page, pageSize, search, status, department, location));
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
        var isGlobalAdmin = HasPermission(AppPermissions.SurveysResultsView);
        var includeIdentities = HasPermission(AppPermissions.SurveysResultsExportIdentified) || HasPermission(AppPermissions.SurveysManage);
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.ExportCampaignResultsCsv.ExportCampaignResultsCsvQuery(id, userId, isGlobalAdmin, includeIdentities));
        return File(result, "text/csv", $"Anket_Sonuclari_{id}.csv");
    }

    [HttpGet("{id:guid}/results")]
    [Authorize]
    public async Task<IActionResult> GetCampaignResults(System.Guid id)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var isGlobalAdmin = HasPermission(AppPermissions.SurveysResultsView);
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignResults.GetCampaignResultsQuery(id, userId, isGlobalAdmin));
        return Ok(result);
    }

    [HttpGet("{id:guid}/analytics/overview")]
    [Authorize]
    public async Task<IActionResult> GetCampaignAnalyticsOverview(Guid id)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var isGlobalAdmin = HasPermission(AppPermissions.SurveysResultsView);
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignResults.GetCampaignResultsQuery(id, userId, isGlobalAdmin));
        return Ok(result);
    }

    [HttpGet("{id:guid}/analytics/segments")]
    [Authorize]
    public async Task<IActionResult> GetCampaignSegments(Guid id, [FromQuery] string dimension = "department")
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var isGlobalAdmin = HasPermission(AppPermissions.SurveysResultsView);
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignSegments.GetCampaignSegmentsQuery(id, dimension, userId, isGlobalAdmin));
        return Ok(result);
    }

    [HttpGet("{id:guid}/analytics/crosstab")]
    [Authorize]
    public async Task<IActionResult> GetCampaignCrosstab(Guid id, [FromQuery] Guid questionId, [FromQuery] string dimension = "department")
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var isGlobalAdmin = HasPermission(AppPermissions.SurveysResultsView);
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignCrosstab.GetCampaignCrosstabQuery(
            id, questionId, dimension, userId, isGlobalAdmin));
        return Ok(result);
    }

    [HttpGet("{id:guid}/analytics/questions/{questionId:guid}/text")]
    [Authorize]
    public async Task<IActionResult> GetQuestionTextAnswers(Guid id, Guid questionId, [FromQuery] int page = 1,
        [FromQuery] int pageSize = 25, [FromQuery] string? search = null)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        var isGlobalAdmin = HasPermission(AppPermissions.SurveysResultsView);
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetQuestionTextAnswers.GetQuestionTextAnswersQuery(
            id, questionId, page, pageSize, search, userId, isGlobalAdmin));
        return Ok(result);
    }

    [HttpGet("{id:guid}/participant-response")]
    [Authorize]
    public async Task<IActionResult> GetParticipantResponse(Guid id, [FromQuery] Guid? assignmentId, [FromQuery] string? receiptCode)
    {
        if (!TryGetCurrentUserId(out var userId)) return Unauthorized();
        if (!assignmentId.HasValue) return BadRequest(new { message = "Kimlikli yanıt için assignmentId gereklidir." });
        var canViewIdentified = HasPermission(AppPermissions.SurveysResultsViewIdentified) || HasPermission(AppPermissions.SurveysManage);
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetIdentifiedParticipantResponse.GetIdentifiedParticipantResponseQuery(
            id, assignmentId.Value, userId, canViewIdentified));
        return Ok(result);
    }

    private bool HasPermission(string permission) =>
        User.HasClaim(c => c.Type == "Permission" && c.Value == permission) || User.IsInRole("Global Admin");

    private bool TryGetCurrentUserId(out Guid userId)
    {
        var claim = User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier);
        var sub = claim?.Value;
        return Guid.TryParse(sub, out userId);
    }
}
