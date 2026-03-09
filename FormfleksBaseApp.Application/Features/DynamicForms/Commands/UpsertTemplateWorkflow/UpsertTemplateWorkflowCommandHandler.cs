using FormfleksBaseApp.DynamicForms.Business.Services;
using MediatR;

using System.Linq;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.UpsertTemplateWorkflow;

public sealed class UpsertTemplateWorkflowCommandHandler : IRequestHandler<UpsertTemplateWorkflowCommand, int>
{
    private readonly IFormTemplateAdminService _service;

    public UpsertTemplateWorkflowCommandHandler(IFormTemplateAdminService service)
    {
        _service = service;
    }

    public async Task<int> Handle(UpsertTemplateWorkflowCommand request, CancellationToken ct)
    {
        return await _service.UpsertWorkflowStepsAsync(request.FormTypeId, request.Steps.ToList(), request.ActorUserId, ct);
    }
}
