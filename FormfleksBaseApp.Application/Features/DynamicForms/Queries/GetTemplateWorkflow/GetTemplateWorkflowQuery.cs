using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetTemplateWorkflow;

public sealed record GetTemplateWorkflowQuery(Guid FormTypeId) : IRequest<IReadOnlyList<FormTemplateWorkflowStepUpsertDto>>;
