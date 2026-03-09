namespace FormfleksBaseApp.Infrastructure.Options;

public sealed class SchemaCompatibilityOptions
{
    public bool FailFast { get; set; } = true;
    public string? ExpectedVersion { get; set; }
}
