using FormfleksBaseApp.DynamicForms.Business.Contracts;

namespace FormfleksBaseApp.DynamicForms.Business.Services;

[System.Obsolete("Bu servis CQRS/MediatR doğrudan DbContext cagrisina donusturuldugu icin ertelemeye alinmistir.")]
public interface IFormDefinitionService
{
    Task<FormDefinitionDto?> GetDefinitionByCodeAsync(string code, CancellationToken ct);
}
