using FormfleksBaseApp.Application.Features.DynamicForms.Commands.ExecuteApprovalAction;
using FormfleksBaseApp.Application.Features.DynamicForms.Commands.SaveDraft;
using FormfleksBaseApp.Application.Features.DynamicForms.Commands.SetTemplateStatus;
using FormfleksBaseApp.Application.Features.DynamicForms.Commands.SubmitRequest;
using FormfleksBaseApp.Application.Features.DynamicForms.Commands.UpsertTemplate;
using FormfleksBaseApp.Application.Features.DynamicForms.Commands.UpsertTemplateWorkflow;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetFormDefinition;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetMyRequests;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetPendingApprovals;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetRoles;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetTemplates;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetTemplateWorkflow;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetAuditLogs;
using FormfleksBaseApp.Application.Features.DynamicForms.Commands.CreateUserDelegation;
using FormfleksBaseApp.Application.Features.DynamicForms.Commands.TerminateUserDelegation;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetUserDelegations;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Queries.GetRequestDetailed;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FormfleksBaseApp.DynamicForms.Web.Controllers;

/// <summary>
/// Dinamik formlar, form talepleri (request), onay süreçleri, şablon yönetimi ve vekaletnameleri yöneten ana API.
/// </summary>
[ApiController]
[Route("api/dynamic-forms")]
[Authorize(Policy = "HasAppRole")]
public sealed class DynamicFormsController : ControllerBase
{
    private readonly IMediator _mediator;

    public DynamicFormsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Belirtilen form koduna göre form şablonunun tanımlarını (alanlar, kurallar vb.) getirir.
    /// </summary>
    [HttpGet("{formCode}")]
    public async Task<ActionResult<FormDefinitionDto>> GetDefinition(string formCode, CancellationToken ct)
    {
        var result = await _mediator.Send(new GetFormDefinitionQuery(formCode), ct);
        if (result is null)
            return NotFound();

        return Ok(result);
    }

    /// <summary>
    /// Kullanıcının doldurduğu formu taslak olarak kaydeder (Henüz onaya sunulmaz).
    /// </summary>
    [HttpPost("requests/draft")]
    public async Task<ActionResult<FormRequestResultDto>> SaveDraft([FromBody] SaveDraftRequestDto request, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        request.RequestorUserId = userId;
        return Ok(await _mediator.Send(new SaveDraftCommand(request), ct));
    }

    /// <summary>
    /// Doldurulan formu onaya sunar (İş akışını başlatır).
    /// </summary>
    [HttpPost("requests/submit")]
    public async Task<ActionResult<FormRequestResultDto>> Submit([FromBody] SubmitRequestDto request, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        request.ActorUserId = userId;
        return Ok(await _mediator.Send(new SubmitRequestCommand(request), ct));
    }

    /// <summary>
    /// Belirtilen form talebinin tüm detaylarını (girilen veriler, onay geçmişi vb.) getirir.
    /// </summary>
    [HttpGet("requests/{requestId:guid}")]
    public async Task<ActionResult<FormRequestDetailedDto>> GetRequestDetailed(Guid requestId, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        var result = await _mediator.Send(new GetRequestDetailedQuery(requestId, userId), ct);
        if (result is null)
            return NotFound();

        return Ok(result);
    }

    /// <summary>
    /// Sisteme giriş yapmış kullanıcının kendi oluşturduğu form taleplerini listeler.
    /// </summary>
    [HttpGet("requests/my")]
    public async Task<ActionResult<IReadOnlyList<MyFormRequestListItemDto>>> GetMyRequests(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        return Ok(await _mediator.Send(new GetMyRequestsQuery(userId), ct));
    }

    /// <summary>
    /// Sisteme giriş yapmış kullanıcının onayını bekleyen form taleplerini listeler.
    /// </summary>
    [HttpGet("approvals/pending")]
    public async Task<ActionResult<IReadOnlyList<PendingApprovalListItemDto>>> GetPendingApprovals(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        return Ok(await _mediator.Send(new GetPendingApprovalsQuery(userId), ct));
    }

    /// <summary>
    /// Kullanıcının geçmişte onayladığı veya reddettiği form taleplerini listeler.
    /// </summary>
    [HttpGet("approvals/history")]
    public async Task<ActionResult<IReadOnlyList<HistoryApprovalListItemDto>>> GetApprovalHistory(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        return Ok(await _mediator.Send(new Application.Features.DynamicForms.Queries.GetApprovalHistory.GetApprovalHistoryQuery(userId), ct));
    }

    /// <summary>
    /// Onay bekleyen bir form talebi üzerinde aksiyon alır (Onayla, Reddet, Revizyon İste).
    /// </summary>
    [HttpPost("approvals/action")]
    public async Task<ActionResult<FormRequestResultDto>> ApprovalAction([FromBody] ApprovalActionRequestDto request, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        request.ActorUserId = userId;
        return Ok(await _mediator.Send(new ExecuteApprovalActionCommand(request), ct));
    }

    /// <summary>
    /// Kullanıcının kendi adına verdiği vekaletleri listeler.
    /// </summary>
    [HttpGet("users/me/delegations")]
    public async Task<ActionResult<IReadOnlyList<UserDelegationDto>>> GetMyDelegations(CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        return Ok(await _mediator.Send(new GetUserDelegationsQuery(userId), ct));
    }

    /// <summary>
    /// Kullanıcının belirli bir tarih aralığında yetkilerini başka bir kullanıcıya devretmesi (Vekalet) için kayıt oluşturur.
    /// </summary>
    [HttpPost("users/me/delegations")]
    public async Task<ActionResult<Guid>> CreateDelegation([FromBody] CreateUserDelegationRequest request, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        var command = new CreateUserDelegationCommand(userId, request.DelegateeUserId, request.StartDate, request.EndDate, request.Reason);
        return Ok(await _mediator.Send(command, ct));
    }

    /// <summary>
    /// Verilmiş olan bir vekaleti sonlandırır/iptal eder.
    /// </summary>
    [HttpDelete("users/me/delegations/{delegationId:guid}")]
    public async Task<ActionResult> TerminateDelegation(Guid delegationId, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        await _mediator.Send(new TerminateUserDelegationCommand(delegationId, userId), ct);
        return NoContent();
    }

    /// <summary>
    /// Sistemdeki tüm form şablonlarını yönetici yetkisiyle listeler.
    /// </summary>
    [HttpGet("admin/templates")]
    [Authorize(Policy = "AdminOrHr")]
    public async Task<ActionResult<IReadOnlyList<FormTemplateSummaryDto>>> GetTemplates(CancellationToken ct)
        => Ok(await _mediator.Send(new GetTemplatesQuery(), ct));

    /// <summary>
    /// Kullanıcıların form oluşturabilmesi için sadece aktif olan şablonları listeler.
    /// </summary>
    [HttpGet("templates")]
    public async Task<ActionResult<IReadOnlyList<FormTemplateSummaryDto>>> GetActiveTemplates(CancellationToken ct)
    {
        var templates = await _mediator.Send(new GetTemplatesQuery(), ct);
        return Ok(templates.Where(t => t.Active).ToList());
    }

    [HttpGet("admin/roles")]
    [Authorize(Policy = "AdminOrHr")]
    public async Task<ActionResult<IReadOnlyList<RoleLookupDto>>> GetRoles(CancellationToken ct)
        => Ok(await _mediator.Send(new GetRolesQuery(), ct));

    [HttpGet("admin/audit-logs")]
    [Authorize(Policy = "AdminOrHr")]
    public async Task<ActionResult<IReadOnlyList<FormfleksBaseApp.Contracts.DynamicForms.AuditLogs.AuditLogItemDto>>> GetAuditLogs(CancellationToken ct)
        => Ok(await _mediator.Send(new GetAuditLogsQuery(), ct));

    /// <summary>
    /// Yeni bir form şablonu oluşturur veya var olan şablonu günceller.
    /// </summary>
    [HttpPost("admin/templates")]
    [Authorize(Policy = "AdminOrHr")]
    public async Task<ActionResult<FormTemplateSummaryDto>> UpsertTemplate([FromBody] FormTemplateUpsertDto request, CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        return Ok(await _mediator.Send(new UpsertTemplateCommand(request, userId), ct));
    }

    [HttpGet("admin/templates/{formTypeId:guid}/workflow")]
    [Authorize(Policy = "AdminOrHr")]
    public async Task<ActionResult<IReadOnlyList<FormTemplateWorkflowStepUpsertDto>>> GetTemplateWorkflow(Guid formTypeId, CancellationToken ct)
        => Ok(await _mediator.Send(new GetTemplateWorkflowQuery(formTypeId), ct));

    /// <summary>
    /// Bir form şablonunun onay iş akışını (adımları, onaylayıcıları vb.) oluşturur veya günceller.
    /// </summary>
    [HttpPost("admin/templates/{formTypeId:guid}/workflow")]
    [Authorize(Policy = "AdminOrHr")]
    public async Task<ActionResult<object>> UpsertTemplateWorkflow(
        Guid formTypeId,
        [FromBody] IReadOnlyList<FormTemplateWorkflowStepUpsertDto> request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        var count = await _mediator.Send(new UpsertTemplateWorkflowCommand(formTypeId, request, userId), ct);
        return Ok(new { stepCount = count });
    }

    /// <summary>
    /// Form şablonunun aktiflik/pasiflik durumunu günceller.
    /// </summary>
    [HttpPatch("admin/templates/{formTypeId:guid}/status")]
    [Authorize(Policy = "AdminOrHr")]
    public async Task<ActionResult<FormTemplateSummaryDto>> SetTemplateStatus(
        Guid formTypeId,
        [FromBody] TemplateStatusUpdateRequest request,
        CancellationToken ct)
    {
        if (!TryGetCurrentUserId(out var userId))
            return Unauthorized();

        return Ok(await _mediator.Send(new SetTemplateStatusCommand(formTypeId, request.Active, userId), ct));
    }

    private bool TryGetCurrentUserId(out Guid userId)
    {
        var sub = User.FindFirst("sub")?.Value ?? User.FindFirst(System.Security.Claims.ClaimTypes.NameIdentifier)?.Value;
        return Guid.TryParse(sub, out userId);
    }

    public sealed class TemplateStatusUpdateRequest
    {
        public bool Active { get; set; }
    }

    public sealed class CreateUserDelegationRequest
    {
        public Guid DelegateeUserId { get; set; }
        public DateTime StartDate { get; set; }
        public DateTime EndDate { get; set; }
        public string? Reason { get; set; }
    }
}
