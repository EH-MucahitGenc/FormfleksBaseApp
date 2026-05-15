using FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetHrAdvancedAnalytics;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetHrFormDetails;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetHrSummaryReport;
using FormfleksBaseApp.DynamicForms.Business.Contracts.Reports;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common.Interfaces;

namespace FormfleksBaseApp.Api.Controllers.DynamicForms;

[ApiController]
[Route("api/dynamic-forms/[controller]")]
[Authorize(Policy = FormfleksBaseApp.Domain.Constants.AppPermissions.PolicyReportsView)]
public class ReportsController : ControllerBase
{
    private readonly IMediator _mediator;
    private readonly IDynamicFormsDbContext _db;

    public ReportsController(IMediator mediator, IDynamicFormsDbContext db)
    {
        _mediator = mediator;
        _db = db;
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

    /// <summary>Returns all distinct branch (Isyeri) names for the filter cascade.</summary>
    [HttpGet("hr-locations")]
    public async Task<ActionResult<List<string>>> GetLocations(CancellationToken ct)
    {
        var locations = await _db.QdmsPersoneller
            .AsNoTracking()
            .Where(p => !string.IsNullOrWhiteSpace(p.Isyeri_Tanimi))
            .Select(p => p.Isyeri_Tanimi!)
            .Distinct()
            .OrderBy(l => l)
            .ToListAsync(ct);
        return Ok(locations);
    }

    /// <summary>Returns departments, optionally filtered by branch location.</summary>
    [HttpGet("hr-departments")]
    public async Task<ActionResult<List<string>>> GetDepartments([FromQuery] string? location, CancellationToken ct)
    {
        var q = _db.QdmsPersoneller.AsNoTracking()
            .Where(p => !string.IsNullOrWhiteSpace(p.Departman_Adi));

        if (!string.IsNullOrWhiteSpace(location))
            q = q.Where(p => p.Isyeri_Tanimi == location);

        var departments = await q
            .Select(p => p.Departman_Adi!)
            .Distinct()
            .OrderBy(d => d)
            .ToListAsync(ct);
        return Ok(departments);
    }

    /// <summary>Returns personnel list filtered by location and/or department for the personnel cascade.</summary>
    [HttpGet("hr-personnel")]
    public async Task<ActionResult<List<HrPersonnelItemDto>>> GetPersonnel(
        [FromQuery] string? location, [FromQuery] string? department, CancellationToken ct)
    {
        var q = _db.QdmsPersoneller.AsNoTracking()
            .Where(p => p.LinkedUserId.HasValue && p.IsActive);

        if (!string.IsNullOrWhiteSpace(location))
            q = q.Where(p => p.Isyeri_Tanimi == location);

        if (!string.IsNullOrWhiteSpace(department))
            q = q.Where(p => p.Departman_Adi == department);

        var personnel = await q
            .Select(p => new HrPersonnelItemDto
            {
                UserId = p.LinkedUserId!.Value,
                FullName = (p.Adi + " " + p.Soyadi).Trim(),
                Department = p.Departman_Adi ?? "-",
                Location = p.Isyeri_Tanimi ?? "-"
            })
            .OrderBy(p => p.FullName)
            .ToListAsync(ct);
        return Ok(personnel);
    }
}
