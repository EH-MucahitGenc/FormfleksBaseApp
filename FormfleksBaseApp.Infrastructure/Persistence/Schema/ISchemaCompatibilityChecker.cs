namespace FormfleksBaseApp.Infrastructure.Persistence.Schema;

public interface ISchemaCompatibilityChecker
{
    Task ValidateAsync(CancellationToken ct);
}
