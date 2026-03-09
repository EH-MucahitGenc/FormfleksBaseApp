using FormfleksBaseApp.DynamicForms.Business.Contracts;

namespace FormfleksBaseApp.DynamicForms.Business.Services;

public interface IFormDefinitionService
{
    Task<FormDefinitionDto?> GetDefinitionByCodeAsync(string code, CancellationToken ct);
}
