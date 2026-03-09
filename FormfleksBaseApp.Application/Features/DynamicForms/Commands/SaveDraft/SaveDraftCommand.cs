using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.SaveDraft;

public sealed record SaveDraftCommand(SaveDraftRequestDto Request) : IRequest<FormRequestResultDto>;
