using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Services;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.ExecuteApprovalAction;

public sealed class ExecuteApprovalActionCommandHandler : IRequestHandler<ExecuteApprovalActionCommand, ApprovalActionResponseDto>
{
    private readonly IApprovalService _service;

    public ExecuteApprovalActionCommandHandler(IApprovalService service)
    {
        _service = service;
    }

    public async Task<ApprovalActionResponseDto> Handle(ExecuteApprovalActionCommand request, CancellationToken ct)
    {
        var action = await _service.ExecuteActionAsync(request.Request, ct);
        return action;
    }
}
