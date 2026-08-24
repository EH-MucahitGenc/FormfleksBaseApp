using FormfleksBaseApp.Application.Features.Surveys.Templates.Commands.CreateTemplate;
using FormfleksBaseApp.Application.Features.Surveys.Templates.Commands.UpdateTemplate;
using FormfleksBaseApp.Application.Features.Surveys.Templates.Queries.GetTemplateById;
using FormfleksBaseApp.Application.Features.Surveys.Templates.Queries.GetTemplates;
using FormfleksBaseApp.Domain.Constants;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Api.Controllers.Admin;

[Authorize(Policy = AppPermissions.PolicySurveysDesign)]
[ApiController]
[Route("api/admin/[controller]")]
public class SurveysController : ControllerBase
{
    private readonly IMediator _mediator;

    public SurveysController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("templates")]
    public async Task<IActionResult> GetTemplates([FromQuery] string? search, [FromQuery] bool? activeOnly)
    {
        var result = await _mediator.Send(new GetTemplatesQuery(search, activeOnly));
        return Ok(result);
    }

    [HttpGet("templates/{id:guid}")]
    public async Task<IActionResult> GetTemplateById(Guid id)
    {
        var result = await _mediator.Send(new GetTemplateByIdQuery(id));
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpGet("templates/{id:guid}/details")]
    public async Task<IActionResult> GetTemplateDetails(Guid id)
    {
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Templates.Queries.GetTemplateDetails.GetTemplateDetailsQuery(id));
        if (result == null) return NotFound();
        return Ok(result);
    }

    [HttpPost("templates")]
    public async Task<IActionResult> CreateTemplate([FromBody] CreateTemplateCommand command)
    {
        var id = await _mediator.Send(command);
        return CreatedAtAction(nameof(GetTemplateById), new { id }, new { id });
    }

    [HttpPut("templates/{id:guid}")]
    public async Task<IActionResult> UpdateTemplate(Guid id, [FromBody] FormfleksBaseApp.Application.Features.Surveys.Templates.Commands.SaveTemplate.SaveTemplateCommand command)
    {
        if (id != command.Id) return BadRequest("ID mismatch");
        
        var result = await _mediator.Send(command);
        if (result == null) return NotFound();
        
        return Ok(result);
    }
}
