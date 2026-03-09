using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Services;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.SetTemplateStatus;

public sealed class SetTemplateStatusCommandHandler : IRequestHandler<SetTemplateStatusCommand, FormTemplateSummaryDto>
{
    private readonly IFormTemplateAdminService _service;

    public SetTemplateStatusCommandHandler(IFormTemplateAdminService service)
    {
        _service = service;
    }

    public async Task<FormTemplateSummaryDto> Handle(SetTemplateStatusCommand request, CancellationToken ct)
    {
        await _service.SetTemplateActiveAsync(request.FormTypeId, request.Active, ct);
        return new FormTemplateSummaryDto(); 
    }
}
