using MediatR;
using System;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.CreateUserDelegation;

public record CreateUserDelegationCommand(Guid DelegatorUserId, Guid DelegateeUserId, DateTime StartDate, DateTime EndDate, string? Reason) : IRequest<Guid>;
