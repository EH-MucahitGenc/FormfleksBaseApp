using FormfleksBaseApp.Application.Common;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetPersonnels;

public class GetPersonnelsQuery : IRequest<PagedResult<QdmsPersonelDto>>
{
    public int Page { get; set; } = 1;
    public int PageSize { get; set; } = 100;
    public string? SearchTerm { get; set; }
    public bool? IsActive { get; set; }
}
