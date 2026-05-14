using FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetHrAdvancedAnalytics;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetHrFormDetails;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetHrSummaryReport;
using FormfleksBaseApp.DynamicForms.Business.Contracts.Reports;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Api.Controllers.DynamicForms;

[ApiController]
[Route("api/dynamic-forms/[controller]")]
[Authorize(Policy = "HrReportAccess")] // Dynamic policy instead of hardcoded roles
public class ReportsController : ControllerBase
{
    private readonly IMediator _mediator;

    public ReportsController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("hr-summary")]
    public async Task<ActionResult<List<HrSummaryReportDto>>> GetHrSummary([FromQuery] GetHrSummaryReportQuery query, CancellationToken ct)
    {
        var result = await _mediator.Send(query, ct);
        return Ok(result);
    }

    [HttpGet("hr-form-details")]
    public async Task<ActionResult<List<HrFormDetailItemDto>>> GetHrFormDetails([FromQuery] GetHrFormDetailsQuery query, CancellationToken ct)
    {
        var result = await _mediator.Send(query, ct);
        return Ok(result);
    }

    [HttpGet("hr-advanced-analytics")]
    public async Task<ActionResult<HrAdvancedAnalyticsDto>> GetHrAdvancedAnalytics([FromQuery] GetHrAdvancedAnalyticsQuery query, CancellationToken ct)
    {
        var result = await _mediator.Send(query, ct);
        return Ok(result);
    }
}
