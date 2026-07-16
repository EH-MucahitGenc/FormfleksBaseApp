using System;

namespace FormfleksBaseApp.Contracts.DynamicForms.IntegrationQueries;

/// <summary>
/// Sistemde tanımlı dış entegrasyon sorgusunu (IntegrationQuery) istemciye dönmek için kullanılan model.
/// </summary>
public sealed class IntegrationQueryDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string ConnectionName { get; set; } = default!;
    public string QueryTemplate { get; set; } = default!;
    public string? ParametersJson { get; set; }
    public int Engine { get; set; }
}

/// <summary>
/// Yeni bir dış entegrasyon sorgusu oluşturmak veya mevcut olanı güncellemek için kullanılan istek modeli.
/// </summary>
public sealed class IntegrationQueryUpsertDto
{
    public string Name { get; set; } = default!;
    public string ConnectionName { get; set; } = default!;
    public string QueryTemplate { get; set; } = default!;
    public string? ParametersJson { get; set; }
    public int Engine { get; set; }
}

/// <summary>
/// Seçim listelerinde (Dropdown, Lookup vb.) dış entegrasyon sorgularının temel bilgilerini listelemek için kullanılan model.
/// </summary>
public sealed class IntegrationQueryLookupDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = default!;
    public string? ParametersJson { get; set; }
}
