using System.Collections.Generic;
using FormfleksBaseApp.Application.Common;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetSyncLogs;

public class GetSyncLogsQuery : IRequest<PagedResult<SyncLogDto>>
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 10;
}
