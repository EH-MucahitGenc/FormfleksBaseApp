using FormfleksBaseApp.Application.Features.Surveys.Participants.Commands.SubmitSurveyResponse;
using FormfleksBaseApp.Application.Features.Surveys.Participants.Queries.GetSurveyByToken;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Api.Controllers;

[ApiController]
[Route("api/surveys/responses")]
[AllowAnonymous] // Anket doldurmak için giriş yapmaya gerek yok, token yeterli
public class SurveyResponsesController : ControllerBase
{
    private readonly IMediator _mediator;

    public SurveyResponsesController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpGet("token/{token}")]
    public async Task<IActionResult> GetSurveyByToken(Guid token)
    {
        var result = await _mediator.Send(new GetSurveyByTokenQuery(token));
        return Ok(result);
    }

    [HttpPost("token/{token}/start")]
    public async Task<IActionResult> StartSurvey(Guid token)
    {
        var result = await _mediator.Send(new FormfleksBaseApp.Application.Features.Surveys.Participants.Commands.StartSurvey.StartSurveyCommand(token));
        return Ok(result);
    }

    [HttpPost]
    public async Task<IActionResult> SubmitResponse([FromBody] SubmitSurveyResponseCommand command)
    {
        var result = await _mediator.Send(command);
        return Ok(result);
    }
}
