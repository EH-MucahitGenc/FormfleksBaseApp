using FormfleksBaseApp.Application.Features.AdminDepartments.Commands.CreateDepartment;
using FormfleksBaseApp.Application.Features.AdminDepartments.Commands.DeleteDepartment;
using FormfleksBaseApp.Application.Features.AdminDepartments.Commands.UpdateDepartment;
using FormfleksBaseApp.Application.Features.AdminDepartments.Dtos;
using FormfleksBaseApp.Application.Features.AdminDepartments.Queries.GetDepartments;
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
[Authorize(Policy = "AdminOrHr")]
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

    #region Departments

    /// <summary>
    /// Sistemdeki tüm departmanları listeler.
    /// </summary>
    [HttpGet("departments")]
    public async Task<ActionResult<IReadOnlyList<AdminDepartmentDto>>> GetDepartments()
        => Ok(await _mediator.Send(new GetAdminDepartmentsQuery()));

    /// <summary>
    /// Yeni bir departman oluşturur.
    /// </summary>
    [HttpPost("departments")]
    public async Task<ActionResult<Guid>> CreateDepartment(CreateDepartmentCommand command)
        => Ok(await _mediator.Send(command));

    /// <summary>
    /// Var olan bir departmanın bilgilerini günceller.
    /// </summary>
    [HttpPut("departments/{id}")]
    public async Task<IActionResult> UpdateDepartment(Guid id, UpdateDepartmentCommand command)
    {
        command.Id = id;
        await _mediator.Send(command);
        return NoContent();
    }

    /// <summary>
    /// Belirtilen departmanı sistemden siler.
    /// </summary>
    [HttpDelete("departments/{id}")]
    public async Task<IActionResult> DeleteDepartment(Guid id)
    {
        await _mediator.Send(new DeleteDepartmentCommand(id));
        return NoContent();
    }

    #endregion
}
