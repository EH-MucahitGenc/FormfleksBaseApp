using FormfleksBaseApp.Contracts.DynamicForms.AuditLogs;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetAuditLogs;

public record GetAuditLogsQuery() : IRequest<List<AuditLogItemDto>>;
