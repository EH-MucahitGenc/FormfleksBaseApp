namespace FormfleksBaseApp.Application.Common.Models;

public class EmailSettings
{
    public bool Enabled { get; set; } = true;
    public SmtpSettings Smtp { get; set; } = new();
}

public class SmtpSettings
{
    public string Host { get; set; } = string.Empty;
    public int Port { get; set; }
    public string Username { get; set; } = string.Empty;
    public string Password { get; set; } = string.Empty;
    public bool EnableSsl { get; set; }
    public string DefaultFrom { get; set; } = string.Empty;
    
    // Resilience settings
    public int RetryCount { get; set; } = 3;
    public int RetryDelayMs { get; set; } = 200;
    public int ExceptionsAllowedBeforeBreaking { get; set; } = 3;
    public int DurationOfBreakSeconds { get; set; } = 30;
    public int TimeoutSeconds { get; set; } = 5;
}
