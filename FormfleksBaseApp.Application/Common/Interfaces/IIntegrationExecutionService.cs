using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IIntegrationExecutionService
{
    /// <summary>
    /// Executes a configured integration query and returns a dictionary of mapped values.
    /// </summary>
    /// <param name="queryId">The ID of the IntegrationQueryEntity</param>
    /// <param name="parameters">The key-value pairs of parameters passed from the frontend</param>
    /// <param name="ct">Cancellation token</param>
    /// <returns>A dictionary containing the first row of the query result, mapped to column names.</returns>
    Task<IDictionary<string, object>?> ExecuteQueryAsync(Guid queryId, IDictionary<string, string> parameters, CancellationToken ct);
}
