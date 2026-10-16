using FormfleksBaseApp.Contracts.DynamicForms.EmailLogs;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetEmailLogs;

public sealed record GetEmailLogsQuery : IRequest<List<EmailLogListItemDto>>;
public sealed record GetEmailLogDetailQuery(Guid Id) : IRequest<EmailLogDetailDto?>;
