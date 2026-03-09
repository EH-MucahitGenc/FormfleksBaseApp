namespace FormfleksBaseApp.Application.Common;

public sealed class ConflictException : ApiException
{
    public ConflictException(string message)
        : base(409, ErrorCodes.Conflict, "Conflict", message) { }
}
