namespace FormfleksBaseApp.Web.Models;

public sealed class ApiCallResult<T>
{
    public bool Success { get; set; }
    public T? Data { get; set; }
    public string? Error { get; set; }
    public int? StatusCode { get; set; }
}
