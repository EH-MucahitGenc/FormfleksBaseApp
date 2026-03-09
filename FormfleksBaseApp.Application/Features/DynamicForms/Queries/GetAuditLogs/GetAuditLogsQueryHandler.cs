using FormfleksBaseApp.Application.DynamicForms.Business.Services;
using FormfleksBaseApp.Contracts.DynamicForms.AuditLogs;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetAuditLogs;

public sealed class GetAuditLogsQueryHandler : IRequestHandler<GetAuditLogsQuery, List<AuditLogItemDto>>
{
    private readonly IAuditLogService _service;

    public GetAuditLogsQueryHandler(IAuditLogService service)
    {
        _service = service;
    }

    public Task<List<AuditLogItemDto>> Handle(GetAuditLogsQuery request, CancellationToken ct)
    {
        return _service.GetLogsAsync(ct);
    }
}
