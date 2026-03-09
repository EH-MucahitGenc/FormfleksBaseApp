using Dapper;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Integrations.Oracle;
using FormfleksBaseApp.Application.Integrations.Oracle.CompanyPersons;

namespace FormfleksBaseApp.Infrastructure.Integrations.Oracle.CompanyPersons;

public sealed class TrautCompanyPersonRepository : ITrautCompanyPersonRepository
{
    private readonly IOracleConnectionFactory _factory;

    public TrautCompanyPersonRepository(IOracleConnectionFactory factory)
        => _factory = factory;

    public async Task<PagedResult<TrautCompanyPersonDto>> GetPagedAsync(string? search, int page, int pageSize, CancellationToken ct)
    {
        const string countSql = @"
SELECT COUNT(1)
FROM TRAUT_COMPANY_PERSON
WHERE (:searchLike IS NULL OR UPPER(NAME) LIKE :searchLike)";

        const string dataSql = @"
SELECT
  COMPANY      AS Company,
  EMPLOYEE_ID  AS EmployeeId,
  NAME         AS Name
FROM TRAUT_COMPANY_PERSON
WHERE (:searchLike IS NULL OR UPPER(NAME) LIKE :searchLike)
ORDER BY NAME, EMPLOYEE_ID
OFFSET :offset ROWS FETCH NEXT :pageSize ROWS ONLY";

        var searchLike = string.IsNullOrWhiteSpace(search)
            ? null
            : $"%{search.Trim().ToUpperInvariant()}%";

        var offset = (page - 1) * pageSize;
        var parameters = new
        {
            searchLike,
            offset,
            pageSize
        };

        using var conn = _factory.Create();
        conn.Open();

        var countCmd = new CommandDefinition(countSql, parameters, cancellationToken: ct);
        var totalCount = await conn.QuerySingleAsync<long>(countCmd);

        var dataCmd = new CommandDefinition(dataSql, parameters, cancellationToken: ct);
        var rows = (await conn.QueryAsync<TrautCompanyPersonDto>(dataCmd)).AsList();

        return new PagedResult<TrautCompanyPersonDto>(rows, page, pageSize, totalCount);
    }
}
