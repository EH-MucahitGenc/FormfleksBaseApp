namespace FormfleksBaseApp.Application.Common.Models;

public class EmailMessage
{
    public List<string> ToAddresses { get; set; } = new();
    public string Subject { get; set; } = string.Empty;
    public string HtmlBody { get; set; } = string.Empty;
}
