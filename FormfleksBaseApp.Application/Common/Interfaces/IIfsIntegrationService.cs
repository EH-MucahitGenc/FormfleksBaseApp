using System;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IIfsIntegrationService
{
    Task SendProbationApprovalSignatureAsync(string systemUsageType, string sicilNo, Guid formRequestId, CancellationToken cancellationToken = default);
}
