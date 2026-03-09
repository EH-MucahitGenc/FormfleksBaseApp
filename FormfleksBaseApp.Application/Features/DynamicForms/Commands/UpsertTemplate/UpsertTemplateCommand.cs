using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.UpsertTemplate;

public sealed record UpsertTemplateCommand(FormTemplateUpsertDto Request, Guid ActorUserId) : IRequest<FormTemplateSummaryDto>;
