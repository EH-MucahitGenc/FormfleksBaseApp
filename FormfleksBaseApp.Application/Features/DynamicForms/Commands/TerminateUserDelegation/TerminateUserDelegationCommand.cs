using MediatR;
using System;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.TerminateUserDelegation;

public record TerminateUserDelegationCommand(Guid DelegationId, Guid ActorUserId) : IRequest<bool>;
