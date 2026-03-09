using System;

namespace FormfleksBaseApp.Infrastructure.Persistence.Schema;

[Obsolete("Bu interface Q3 refactor planında kaldırılacaktır. Yerine EF Core built-in migration API'leri kullanınız.", true)]
public interface ISchemaCompatibilityChecker
{
    Task ValidateAsync(CancellationToken ct);
}
