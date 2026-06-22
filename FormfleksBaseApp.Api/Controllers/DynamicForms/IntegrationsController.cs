using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common.Interfaces;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FormfleksBaseApp.Api.Controllers.DynamicForms;

[Authorize]
[ApiController]
[Route("api/dynamic-forms/[controller]")]
public class IntegrationsController : ControllerBase
{
    private readonly IIntegrationExecutionService _executionService;

    public IntegrationsController(IIntegrationExecutionService executionService)
    {
        _executionService = executionService;
    }

    /// <summary>
    /// Executes a dynamic integration query based on its ID.
    /// Used for auto-filling form fields.
    /// </summary>
    [HttpPost("execute/{queryId:guid}")]
    public async Task<IActionResult> ExecuteQuery(Guid queryId, [FromBody] Dictionary<string, string> parameters, CancellationToken ct)
    {
        if (parameters == null)
            parameters = new Dictionary<string, string>();

        var result = await _executionService.ExecuteQueryAsync(queryId, parameters, ct);
        
        if (result == null)
            return NotFound(new { message = "No data returned for the given parameters." });

        return Ok(result);
    }
}
