using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Services;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetFormDefinition;

public sealed class GetFormDefinitionQueryHandler : IRequestHandler<GetFormDefinitionQuery, FormDefinitionDto?>
{
    private readonly IFormDefinitionService _service;

    public GetFormDefinitionQueryHandler(IFormDefinitionService service)
    {
        _service = service;
    }

    public Task<FormDefinitionDto?> Handle(GetFormDefinitionQuery request, CancellationToken ct)
        => _service.GetDefinitionByCodeAsync(request.FormCode, ct);
}
