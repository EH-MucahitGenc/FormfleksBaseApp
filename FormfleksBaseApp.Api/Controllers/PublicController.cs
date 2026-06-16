using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;

namespace FormfleksBaseApp.Api.Controllers;

[ApiController]
[Route("api/public")]
[AllowAnonymous]
public class PublicController : ControllerBase
{
    private readonly ISystemSettingsService _systemSettingsService;

    public PublicController(ISystemSettingsService systemSettingsService)
    {
        _systemSettingsService = systemSettingsService;
    }

    [HttpGet("system-status")]
    public IActionResult GetSystemStatus()
    {
        var appSettings = _systemSettingsService.GetSetting<AppSettings>("AppSettings");
        return Ok(new
        {
            maintenanceMode = appSettings?.MaintenanceMode ?? false,
            siteName = appSettings?.SiteName ?? "Formfleks"
        });
    }
}
