using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Features.OracleCompanyPersons.Queries.GetAll;
using FormfleksBaseApp.Application.Integrations.Oracle.CompanyPersons;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FormfleksBaseApp.Api.Controllers;

/// <summary>
/// Oracle veritabanından şirket personellerini çekmek ve sorgulamak için kullanılan API.
/// </summary>
[ApiController]
[Route("api/oracle/company-persons")]
[Authorize]
public class OracleCompanyPersonsController : ControllerBase
{
    private readonly IMediator _mediator;

    public OracleCompanyPersonsController(IMediator mediator)
        => _mediator = mediator;

    /// <summary>
    /// Oracle sisteminden sayfalayarak (pagination) ve arama yaparak personel listesi getirir.
    /// </summary>
    [HttpGet]
    public async Task<ActionResult<PagedResult<TrautCompanyPersonDto>>> GetAll(
        [FromQuery] string? search,
        [FromQuery] int page = 1,
        [FromQuery] int pageSize = 50,
        CancellationToken ct = default)
    {
        var data = await _mediator.Send(new OracleCompanyPersonsGetAllQuery
        {
            Search = search,
            Page = page,
            PageSize = pageSize
        }, ct);

        return Ok(data);
    }
}
