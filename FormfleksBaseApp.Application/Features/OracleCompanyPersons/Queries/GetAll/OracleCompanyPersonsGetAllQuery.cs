using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Integrations.Oracle.CompanyPersons;
using MediatR;

namespace FormfleksBaseApp.Application.Features.OracleCompanyPersons.Queries.GetAll;

public sealed record OracleCompanyPersonsGetAllQuery : IRequest<PagedResult<TrautCompanyPersonDto>>
{
    public string? Search { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 50;
}
