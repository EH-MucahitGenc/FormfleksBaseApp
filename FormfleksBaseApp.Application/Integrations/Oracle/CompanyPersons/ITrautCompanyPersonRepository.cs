using FormfleksBaseApp.Application.Common;

namespace FormfleksBaseApp.Application.Integrations.Oracle.CompanyPersons;

public interface ITrautCompanyPersonRepository
{
    Task<PagedResult<TrautCompanyPersonDto>> GetPagedAsync(string? search, int page, int pageSize, CancellationToken ct);
}
