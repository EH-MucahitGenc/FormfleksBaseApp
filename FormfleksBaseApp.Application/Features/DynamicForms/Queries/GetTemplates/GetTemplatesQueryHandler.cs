using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Services;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetTemplates;

public sealed class GetTemplatesQueryHandler : IRequestHandler<GetTemplatesQuery, IReadOnlyList<FormTemplateSummaryDto>>
{
    private readonly IFormTemplateAdminService _service;

    public GetTemplatesQueryHandler(IFormTemplateAdminService service)
    {
        _service = service;
    }

    public async Task<IReadOnlyList<FormTemplateSummaryDto>> Handle(GetTemplatesQuery request, CancellationToken ct)
    {
        var templates = await _service.GetTemplatesAsync(ct);
        return templates;
    }
}
