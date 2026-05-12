using FormfleksBaseApp.Application.Features.AdminUsers.Commands.DeleteUser;
using FormfleksBaseApp.Application.Features.AdminUsers.Commands.UpdateUser;
using FormfleksBaseApp.Application.Features.AdminUsers.DTOs;
using FormfleksBaseApp.Application.Features.AdminUsers.Queries.GetRoles;
using FormfleksBaseApp.Application.Features.AdminUsers.Queries.GetUsers;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FormfleksBaseApp.Api.Controllers;

/// <summary>
/// Sistem yöneticileri için kullanıcı yönetimi ve yetkilendirme işlemlerini sağlayan API.
/// </summary>
[ApiController]
[Route("api/admin/users")]
[Authorize]
public sealed class AdminUsersController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdminUsersController(IMediator mediator)
    {
        _mediator = mediator;
    }

    /// <summary>Tüm kullanıcıları listele</summary>
    [HttpGet]
    public async Task<ActionResult<List<AdminUserDto>>> GetUsers(CancellationToken ct)
    {
        var users = await _mediator.Send(new GetAdminUsersQuery(), ct);
        return Ok(users);
    }

    /// <summary>Sistemdeki tüm rolleri getir (dropdown için)</summary>
    [HttpGet("roles")]
    public async Task<ActionResult<List<RoleDto>>> GetRoles(CancellationToken ct)
    {
        var roles = await _mediator.Send(new GetAdminRolesQuery(), ct);
        return Ok(roles);
    }

    /// <summary>Kullanıcı güncelle (sadece DisplayName ve roller)</summary>
    [HttpPut("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult> UpdateUser(Guid id, [FromBody] UpdateUserDto dto, CancellationToken ct)
    {
        await _mediator.Send(new UpdateAdminUserCommand(id, dto), ct);
        return Ok(new { message = "Kullanıcı başarıyla güncellendi." });
    }

    /// <summary>Kullanıcıyı pasif yap (soft delete)</summary>
    [HttpDelete("{id:guid}")]
    [Authorize(Policy = "AdminOnly")]
    public async Task<ActionResult> DeleteUser(Guid id, CancellationToken ct)
    {
        await _mediator.Send(new DeleteAdminUserCommand(id), ct);
        return Ok(new { message = "Kullanıcı pasif duruma alındı." });
    }
}
