using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Contracts.DynamicForms.IntegrationQueries;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IIntegrationQueryService
{
    Task<List<IntegrationQueryDto>> GetAllQueriesAsync(CancellationToken ct = default);
    Task<List<IntegrationQueryLookupDto>> GetLookupQueriesAsync(CancellationToken ct = default);
    Task<IntegrationQueryDto> GetQueryByIdAsync(Guid id, CancellationToken ct = default);
    Task<IntegrationQueryDto> CreateQueryAsync(IntegrationQueryUpsertDto dto, CancellationToken ct = default);
    Task<IntegrationQueryDto> UpdateQueryAsync(Guid id, IntegrationQueryUpsertDto dto, CancellationToken ct = default);
    Task DeleteQueryAsync(Guid id, CancellationToken ct = default);
}
