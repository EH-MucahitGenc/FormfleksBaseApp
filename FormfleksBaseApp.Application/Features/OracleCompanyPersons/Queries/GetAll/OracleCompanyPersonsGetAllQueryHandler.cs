using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Integrations.Oracle.CompanyPersons;
using MediatR;

namespace FormfleksBaseApp.Application.Features.OracleCompanyPersons.Queries.GetAll;

public sealed class OracleCompanyPersonsGetAllQueryHandler
    : IRequestHandler<OracleCompanyPersonsGetAllQuery, PagedResult<TrautCompanyPersonDto>>
{
    private readonly ITrautCompanyPersonRepository _repo;

    public OracleCompanyPersonsGetAllQueryHandler(ITrautCompanyPersonRepository repo)
        => _repo = repo;

    public Task<PagedResult<TrautCompanyPersonDto>> Handle(OracleCompanyPersonsGetAllQuery request, CancellationToken ct)
        => _repo.GetPagedAsync(request.Search, request.Page, request.PageSize, ct);
}
