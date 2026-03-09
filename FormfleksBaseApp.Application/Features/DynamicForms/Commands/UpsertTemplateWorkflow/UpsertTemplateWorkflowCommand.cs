using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.UpsertTemplateWorkflow;

public sealed record UpsertTemplateWorkflowCommand(
    Guid FormTypeId,
    IReadOnlyList<FormTemplateWorkflowStepUpsertDto> Steps,
    Guid ActorUserId) : IRequest<int>;
