using MediatR;
using System;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.DeleteRequest;

public sealed record DeleteRequestCommand(Guid RequestId, Guid ActorUserId) : IRequest<bool>;
