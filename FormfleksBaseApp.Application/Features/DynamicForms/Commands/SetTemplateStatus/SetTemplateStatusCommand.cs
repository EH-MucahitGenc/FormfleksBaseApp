using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.SetTemplateStatus;

public sealed record SetTemplateStatusCommand(Guid FormTypeId, bool Active, Guid ActorUserId) : IRequest<FormTemplateSummaryDto>;
