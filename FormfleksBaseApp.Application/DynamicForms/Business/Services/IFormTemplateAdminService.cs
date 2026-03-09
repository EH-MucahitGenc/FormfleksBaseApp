using FormfleksBaseApp.DynamicForms.Business.Contracts;

namespace FormfleksBaseApp.DynamicForms.Business.Services;

public interface IFormTemplateAdminService
{
    Task<List<FormTemplateSummaryDto>> GetTemplatesAsync(CancellationToken ct);
    Task<FormTemplateSummaryDto> UpsertTemplateAsync(FormTemplateUpsertDto dto, Guid actorUserId, CancellationToken ct);
    Task SetTemplateActiveAsync(Guid templateId, bool isActive, CancellationToken ct);
    Task<List<FormTemplateRoleDto>> GetRolesAsync(CancellationToken ct);
    Task<List<FormTemplateWorkflowStepUpsertDto>> GetWorkflowStepsAsync(Guid templateId, CancellationToken ct);
    Task<int> UpsertWorkflowStepsAsync(Guid templateId, List<FormTemplateWorkflowStepUpsertDto> steps, Guid actorUserId, CancellationToken ct);
}
