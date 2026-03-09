using FormfleksBaseApp.Application.Auth.Dtos;
using FormfleksBaseApp.Application.Features.Auth.Commands.AdLogin;
using FormfleksBaseApp.Application.Features.Auth.Commands.Login;
using FormfleksBaseApp.Application.Features.Auth.Commands.Logout;
using FormfleksBaseApp.Application.Features.Auth.Commands.Refresh;
using FormfleksBaseApp.Application.Features.Auth.Commands.Register;
using MediatR;
using Microsoft.AspNetCore.Mvc;

[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken ct)
    {
        await _mediator.Send(new RegisterCommand(request), ct);
        return NoContent();
    }

    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new LoginCommand(request), ct));

    [HttpPost("ad-login")]
    public async Task<ActionResult<AuthResponse>> AdLogin(AdLoginRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new AdLoginCommand(request), ct));

    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new RefreshCommand(request), ct));

    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken ct)
    {
        await _mediator.Send(new LogoutCommand(request), ct);
        return NoContent();
    }
}
