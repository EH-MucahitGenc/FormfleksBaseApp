using FormfleksBaseApp.DynamicForms.Business.Contracts;

namespace FormfleksBaseApp.DynamicForms.Business.Services;

public interface IFormRequestService
{
    Task<FormRequestResultDto> SaveDraftAsync(SaveDraftRequestDto dto, CancellationToken ct);
    Task<FormRequestResultDto> SubmitAsync(SubmitRequestDto dto, CancellationToken ct);
    Task<List<MyFormRequestListItemDto>> GetMyRequestsAsync(Guid userId, CancellationToken ct);
    Task<FormRequestDetailedDto?> GetRequestDetailedAsync(Guid requestId, CancellationToken ct);
}
