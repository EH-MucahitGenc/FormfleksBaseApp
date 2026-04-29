using FormfleksBaseApp.Application.Features.Visitors.Commands.CreateVisitor;
using FormfleksBaseApp.Application.Features.Visitors.Queries.GetVisitors;
using FormfleksBaseApp.Contracts.Common;
using FormfleksBaseApp.Contracts.Visitors;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FormfleksBaseApp.Api.Controllers;

/// <summary>
/// Ziyaretçi yönetimi ve kayıt işlemlerini sağlayan API.
/// </summary>
[ApiController]
[Route("api/visitors")]
[Authorize(Policy = "HasAppRole")]
public sealed class VisitorsController : ControllerBase
{
    private readonly IMediator _mediator;

    public VisitorsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Sistemdeki kayıtlı tüm ziyaretçileri listeler.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<ApiResponse<IReadOnlyList<VisitorDto>>>> GetAll(CancellationToken ct)
    {
        var result = await _mediator.Send(new GetVisitorsQuery(), ct);
        return result.IsSuccess ? Ok(ApiResponse<IReadOnlyList<VisitorDto>>.Success(result.Value!))
                                : BadRequest(ApiResponse<IReadOnlyList<VisitorDto>>.Fail(result.Error!.Message, result.Error));
    }

    /// <summary>
    /// Sisteme yeni bir ziyaretçi kaydı ekler.
    /// </summary>
    [HttpPost]
    public async Task<ActionResult<ApiResponse<Guid>>> Create([FromBody] CreateVisitorRequestDto request, CancellationToken ct)
    {
        var result = await _mediator.Send(new CreateVisitorCommand(request), ct);
        return result.IsSuccess ? Ok(ApiResponse<Guid>.Success(result.Value))
                                : BadRequest(ApiResponse<Guid>.Fail(result.Error!.Message, result.Error));
    }
}
