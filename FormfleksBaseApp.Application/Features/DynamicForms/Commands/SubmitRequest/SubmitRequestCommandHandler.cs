using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Services;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.SubmitRequest;

public sealed class SubmitRequestCommandHandler : IRequestHandler<SubmitRequestCommand, FormRequestResultDto>
{
    private readonly IFormRequestService _service;

    public SubmitRequestCommandHandler(IFormRequestService service)
    {
        _service = service;
    }

    public Task<FormRequestResultDto> Handle(SubmitRequestCommand request, CancellationToken ct)
        => _service.SubmitAsync(request.Request, ct);
}
