using System;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Contracts.DynamicForms.IntegrationQueries;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FormfleksBaseApp.Api.Controllers;

[ApiController]
[Route("api/[controller]")]
public class IntegrationQueriesController : ControllerBase
{
    private readonly IIntegrationQueryService _service;

    public IntegrationQueriesController(IIntegrationQueryService service)
    {
        _service = service;
    }

    [HttpGet]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetAll(CancellationToken ct)
    {
        var queries = await _service.GetAllQueriesAsync(ct);
        return Ok(queries);
    }

    [HttpGet("lookup")]
    [Authorize]
    public async Task<IActionResult> GetLookup(CancellationToken ct)
    {
        var lookup = await _service.GetLookupQueriesAsync(ct);
        return Ok(lookup);
    }

    [HttpGet("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> GetById([FromRoute] Guid id, CancellationToken ct)
    {
        var query = await _service.GetQueryByIdAsync(id, ct);
        return Ok(query);
    }

    [HttpPost]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Create([FromBody] IntegrationQueryUpsertDto dto, CancellationToken ct)
    {
        var created = await _service.CreateQueryAsync(dto, ct);
        return CreatedAtAction(nameof(GetById), new { id = created.Id }, created);
    }

    [HttpPut("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Update([FromRoute] Guid id, [FromBody] IntegrationQueryUpsertDto dto, CancellationToken ct)
    {
        var updated = await _service.UpdateQueryAsync(id, dto, ct);
        return Ok(updated);
    }

    [HttpDelete("{id}")]
    [Authorize(Roles = "Admin")]
    public async Task<IActionResult> Delete([FromRoute] Guid id, CancellationToken ct)
    {
        await _service.DeleteQueryAsync(id, ct);
        return NoContent();
    }
}
