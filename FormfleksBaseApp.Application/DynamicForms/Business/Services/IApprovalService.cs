using FormfleksBaseApp.DynamicForms.Business.Contracts;

namespace FormfleksBaseApp.DynamicForms.Business.Services;

public interface IApprovalService
{
    Task<List<PendingApprovalListItemDto>> GetPendingApprovalsAsync(Guid userId, CancellationToken ct);
    Task<ApprovalActionResponseDto> ExecuteActionAsync(ApprovalActionRequestDto req, CancellationToken ct);
}
