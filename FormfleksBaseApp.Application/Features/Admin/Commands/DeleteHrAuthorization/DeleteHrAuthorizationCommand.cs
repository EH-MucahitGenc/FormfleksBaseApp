using MediatR;
using System;

namespace FormfleksBaseApp.Application.Features.Admin.Commands.DeleteHrAuthorization;

public class DeleteHrAuthorizationCommand : IRequest<bool>
{
    public Guid UserId { get; set; }
}
