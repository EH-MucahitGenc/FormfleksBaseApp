using FormfleksBaseApp.Contracts.DynamicForms.FormTracking;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetFormTracking;

public sealed record GetFormTrackingListQuery : IRequest<FormTrackingListResultDto>
{
    public string? Search { get; init; }
    public string? SystemUsageType { get; init; }
    public short? Status { get; init; }
    public string? OwnerSearch { get; init; }
    public DateTime? StartDate { get; init; }
    public DateTime? EndDate { get; init; }
    public int? MinWaitingDays { get; init; }
    public int Page { get; init; } = 1;
    public int PageSize { get; init; } = 25;
}

public sealed record GetFormTrackingDetailQuery(Guid RequestId) : IRequest<FormTrackingDetailDto?>;

public sealed record GetFormTrackingEmailDetailQuery(Guid RequestId, Guid EmailId) : IRequest<FormTrackingEmailDetailDto?>;
