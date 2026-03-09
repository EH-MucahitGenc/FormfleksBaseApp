using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Services;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.UpsertTemplate;

public sealed class UpsertTemplateCommandHandler : IRequestHandler<UpsertTemplateCommand, FormTemplateSummaryDto>
{
    private readonly IFormTemplateAdminService _service;

    public UpsertTemplateCommandHandler(IFormTemplateAdminService service)
    {
        _service = service;
    }

    public Task<FormTemplateSummaryDto> Handle(UpsertTemplateCommand request, CancellationToken ct)
        => _service.UpsertTemplateAsync(request.Request, request.ActorUserId, ct);
}
