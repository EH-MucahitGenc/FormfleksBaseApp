namespace FormfleksBaseApp.Application.Common;

public sealed class ExternalServiceException : ApiException
{
    public string ServiceName { get; }

    public ExternalServiceException(
        string serviceName,
        string message,
        int statusCode = 503,
        string errorCode = ErrorCodes.ExternalServiceUnavailable,
        string title = "External service error")
        : base(statusCode, errorCode, title, message)
    {
        ServiceName = serviceName;
    }
}
