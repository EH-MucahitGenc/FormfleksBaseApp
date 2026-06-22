using System;

namespace FormfleksBaseApp.Contracts.DynamicForms.IntegrationQueries;

public sealed class IntegrationQueryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string ConnectionName { get; set; } = default!;
    public string QueryTemplate { get; set; } = default!;
    public string? ParametersJson { get; set; }
    public int Engine { get; set; }
}

public sealed class IntegrationQueryUpsertDto
{
    public string Name { get; set; } = default!;
    public string ConnectionName { get; set; } = default!;
    public string QueryTemplate { get; set; } = default!;
    public string? ParametersJson { get; set; }
    public int Engine { get; set; }
}

public sealed class IntegrationQueryLookupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? ParametersJson { get; set; }
}
