namespace FormfleksBaseApp.Application.Common;

public sealed class GoneException : ApiException
{
    public GoneException(string message)
        : base(410, "Gone", "Gone", message) { }
}
