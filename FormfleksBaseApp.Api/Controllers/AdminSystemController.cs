
using FormfleksBaseApp.Application.Features.AdminRoles.Commands.CreateRole;
using FormfleksBaseApp.Application.Features.AdminRoles.Commands.DeleteRole;
using FormfleksBaseApp.Application.Features.AdminRoles.Commands.UpdateRole;
using FormfleksBaseApp.Application.Features.AdminRoles.Dtos;
using FormfleksBaseApp.Application.Features.AdminRoles.Queries.GetRoles;
using MediatR;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FormfleksBaseApp.Api.Controllers;

/// <summary>
/// Sistem ayarları, Roller ve Departmanlar ile ilgili işlemleri yöneten API.
/// </summary>
[ApiController]
[Route("api/admin")]
[Authorize(Policy = FormfleksBaseApp.Domain.Constants.AppPermissions.PolicyRolesManage)]
public class AdminSystemController : ControllerBase
{
    private readonly IMediator _mediator;

    public AdminSystemController(IMediator mediator)
    {
        _mediator = mediator;
    }

    #region Roles

    /// <summary>
    /// Sistemdeki tüm rolleri listeler.
    /// </summary>
    [HttpGet("roles")]
    public async Task<ActionResult<IReadOnlyList<AdminRoleDto>>> GetRoles()
        => Ok(await _mediator.Send(new GetAdminRolesQuery()));

    /// <summary>
    /// Yeni bir rol oluşturur.
    /// </summary>
    [HttpPost("roles")]
    public async Task<ActionResult<Guid>> CreateRole(CreateRoleCommand command)
        => Ok(await _mediator.Send(command));

    /// <summary>
    /// Var olan bir rolün bilgilerini günceller.
    /// </summary>
    [HttpPut("roles/{id}")]
    public async Task<IActionResult> UpdateRole(Guid id, UpdateRoleCommand command)
    {
        command.Id = id;
        await _mediator.Send(command);
        return NoContent();
    }

    /// <summary>
    /// Belirtilen rolü sistemden siler.
    /// </summary>
    [HttpDelete("roles/{id}")]
    public async Task<IActionResult> DeleteRole(Guid id)
    {
        await _mediator.Send(new DeleteRoleCommand(id));
        return NoContent();
    }

    #endregion

    #region Permissions

    /// <summary>
    /// Sistemdeki mevcut tüm yetki tanımlarını listeler.
    /// </summary>
    [HttpGet("permissions")]
    public async Task<ActionResult<IReadOnlyList<PermissionDto>>> GetPermissions()
        => Ok(await _mediator.Send(new FormfleksBaseApp.Application.Features.AdminRoles.Queries.GetPermissions.GetPermissionsQuery()));

    /// <summary>
    /// Belirtilen rolün sahip olduğu yetki kodlarını (string listesi olarak) getirir.
    /// </summary>
    [HttpGet("roles/{id}/permissions")]
    public async Task<ActionResult<IReadOnlyList<string>>> GetRolePermissions(Guid id)
        => Ok(await _mediator.Send(new FormfleksBaseApp.Application.Features.AdminRoles.Queries.GetRolePermissions.GetRolePermissionsQuery(id)));

    /// <summary>
    /// Belirtilen role gönderilen yetki kodlarını (string listesi) atar, eski yetkilerini siler.
    /// </summary>
    [HttpPut("roles/{id}/permissions")]
    public async Task<IActionResult> UpdateRolePermissions(Guid id, [FromBody] List<string> permissions)
    {
        var command = new FormfleksBaseApp.Application.Features.AdminRoles.Commands.UpdateRolePermissions.UpdateRolePermissionsCommand
        {
            RoleId = id,
            Permissions = permissions
        };
        await _mediator.Send(command);
        return NoContent();
    }

    #endregion
}
