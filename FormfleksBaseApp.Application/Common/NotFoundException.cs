namespace FormfleksBaseApp.Application.Common;

public sealed class NotFoundException : ApiException
{
    public NotFoundException(string message)
        : base(404, "NotFound", "Not Found", message) { }
}
