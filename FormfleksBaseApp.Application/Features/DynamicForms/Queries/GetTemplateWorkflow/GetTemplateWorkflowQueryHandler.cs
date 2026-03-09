using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Services;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetTemplateWorkflow;

public sealed class GetTemplateWorkflowQueryHandler : IRequestHandler<GetTemplateWorkflowQuery, IReadOnlyList<FormTemplateWorkflowStepUpsertDto>>
{
    private readonly IFormTemplateAdminService _service;

    public GetTemplateWorkflowQueryHandler(IFormTemplateAdminService service)
    {
        _service = service;
    }

    public async Task<IReadOnlyList<FormTemplateWorkflowStepUpsertDto>> Handle(GetTemplateWorkflowQuery request, CancellationToken ct)
    {
        return await _service.GetWorkflowStepsAsync(request.FormTypeId, ct);
    }
}
