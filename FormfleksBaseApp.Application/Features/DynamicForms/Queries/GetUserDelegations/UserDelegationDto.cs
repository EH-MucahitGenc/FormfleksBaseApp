using System;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetUserDelegations;

public class UserDelegationDto
{
    public Guid Id { get; set; }
    public Guid DelegatorUserId { get; set; }
    public Guid DelegateeUserId { get; set; }
    public string DelegateeName { get; set; } = string.Empty;
    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }
    public bool IsActive { get; set; }
    public string? Reason { get; set; }
    public DateTime CreatedAt { get; set; }
}
