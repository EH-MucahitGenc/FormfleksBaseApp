using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.ClaimDraft;

public sealed record ClaimDraftCommand(Guid RequestId, Guid ActorUserId) : IRequest<FormRequestResultDto>;
