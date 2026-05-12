using MediatR;
using System;
using System.Collections.Generic;

namespace FormfleksBaseApp.Application.Features.Admin.Commands.SetHrAuthorizations;

public class SetHrAuthorizationsCommand : IRequest<bool>
{
    public Guid UserId { get; set; }
    public bool IsGlobalManager { get; set; }
    public List<string> Locations { get; set; } = new();
}
