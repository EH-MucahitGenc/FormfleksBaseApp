using MediatR;
using System;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.ReassignRequest;

public sealed record ReassignRequestCommand(Guid RequestId, Guid NewOwnerUserId, Guid CurrentUserId, bool IsAdmin) : IRequest<Unit>;
