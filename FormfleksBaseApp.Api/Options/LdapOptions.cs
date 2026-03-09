namespace FormfleksBaseApp.Api.Options;

public class LdapOptions
{
    public bool IsActive { get; set; }

    public string Host { get; set; } = default!;
    public int Port { get; set; } = 389;
    public bool UseSsl { get; set; }

    public string Domain { get; set; } = default!;
    public string BaseDn { get; set; } = default!;

    // Search için service account (opsiyonel ama önerilir)
    public string? ServiceUserName { get; set; }    // imes.ldap
    public string? ServicePassword { get; set; }    // ...
}
