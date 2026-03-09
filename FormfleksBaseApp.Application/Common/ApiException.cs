namespace FormfleksBaseApp.Application.Common;

public abstract class ApiException : Exception
{
    public int StatusCode { get; }
    public string ErrorCode { get; }
    public string Title { get; }

    protected ApiException(int statusCode, string errorCode, string title, string message)
        : base(message)
    {
        StatusCode = statusCode;
        ErrorCode = errorCode;
        Title = title;
    }
}
