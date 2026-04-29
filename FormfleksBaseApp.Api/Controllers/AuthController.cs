using FormfleksBaseApp.Application.Auth.Dtos;
using FormfleksBaseApp.Application.Features.Auth.Commands.AdLogin;
using FormfleksBaseApp.Application.Features.Auth.Commands.Login;
using FormfleksBaseApp.Application.Features.Auth.Commands.Logout;
using FormfleksBaseApp.Application.Features.Auth.Commands.Refresh;
using FormfleksBaseApp.Application.Features.Auth.Commands.Register;
using MediatR;
using Microsoft.AspNetCore.Mvc;

/// <summary>
/// Kullanıcı kimlik doğrulama, giriş, çıkış ve token yenileme işlemlerini yöneten API.
/// </summary>
[ApiController]
[Route("api/auth")]
public class AuthController : ControllerBase
{
    private readonly IMediator _mediator;

    public AuthController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>
    /// Yeni bir kullanıcı hesabı oluşturur (Kayıt).
    /// </summary>
    [HttpPost("register")]
    public async Task<IActionResult> Register(RegisterRequest request, CancellationToken ct)
    {
        await _mediator.Send(new RegisterCommand(request), ct);
        return NoContent();
    }

    /// <summary>
    /// Yerel kullanıcı veritabanı ile sisteme giriş yapar.
    /// </summary>
    [HttpPost("login")]
    public async Task<ActionResult<AuthResponse>> Login(LoginRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new LoginCommand(request), ct));

    /// <summary>
    /// Active Directory (LDAP) üzerinden sisteme giriş yapar.
    /// </summary>
    [HttpPost("ad-login")]
    public async Task<ActionResult<FormfleksBaseApp.Contracts.Auth.LoginResponse>> AdLogin(FormfleksBaseApp.Contracts.Auth.LoginRequest request, CancellationToken ct)
    {
        var cmdRequest = new FormfleksBaseApp.Application.Auth.Dtos.AdLoginRequest { Username = request.Username, Password = request.Password };
        var authResponse = await _mediator.Send(new AdLoginCommand(cmdRequest), ct);
        
        return Ok(new FormfleksBaseApp.Contracts.Auth.LoginResponse
        {
            Token = authResponse.AccessToken,
            RefreshToken = authResponse.RefreshToken,
            Username = request.Username,
            UserId = authResponse.UserId,
            FirstName = authResponse.FirstName,
            LastName = authResponse.LastName,
            Roles = authResponse.Roles
        });
    }

    /// <summary>
    /// Süresi dolmak üzere olan Access Token'ı, Refresh Token kullanarak yeniler.
    /// </summary>
    [HttpPost("refresh")]
    public async Task<ActionResult<AuthResponse>> Refresh(RefreshRequest request, CancellationToken ct)
        => Ok(await _mediator.Send(new RefreshCommand(request), ct));

    /// <summary>
    /// Kullanıcının sistemden güvenli bir şekilde çıkış yapmasını sağlar (Token geçersiz kılınır).
    /// </summary>
    [HttpPost("logout")]
    public async Task<IActionResult> Logout(RefreshRequest request, CancellationToken ct)
    {
        await _mediator.Send(new LogoutCommand(request), ct);
        return NoContent();
    }
}
