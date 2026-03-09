using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Services;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.SaveDraft;

public sealed class SaveDraftCommandHandler : IRequestHandler<SaveDraftCommand, FormRequestResultDto>
{
    private readonly IFormRequestService _service;

    public SaveDraftCommandHandler(IFormRequestService service)
    {
        _service = service;
    }

    public Task<FormRequestResultDto> Handle(SaveDraftCommand request, CancellationToken ct)
        => _service.SaveDraftAsync(request.Request, ct);
}
