using FormfleksBaseApp.DynamicForms.Business.Contracts;

namespace FormfleksBaseApp.DynamicForms.Business.Services;

[System.Obsolete("Bu servis CQRS/MediatR doğrudan DbContext cagrisina donusturuldugu icin ertelemeye alinmistir.")]
public interface IApprovalService
{
    Task<List<PendingApprovalListItemDto>> GetPendingApprovalsAsync(Guid userId, CancellationToken ct);
    Task<ApprovalActionResponseDto> ExecuteActionAsync(ApprovalActionRequestDto req, CancellationToken ct);
}
