using System;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetHrAuthorizations;

public class HrAuthorizationDto
{
    public Guid Id { get; set; }
    public Guid UserId { get; set; }
    public string UserName { get; set; } = string.Empty;
    public string UserEmail { get; set; } = string.Empty;
    public bool IsGlobalManager { get; set; }
    public string? LocationName { get; set; }
    public bool Active { get; set; }
    public DateTime CreatedAt { get; set; }
}
