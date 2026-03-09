namespace FormfleksBaseApp.Application.Common;

public static class ErrorCodes
{
    public const string ValidationFailed = "VALIDATION_FAILED";
    public const string BusinessRuleViolation = "BUSINESS_RULE_VIOLATION";
    public const string NotFound = "NOT_FOUND";
    public const string Conflict = "CONFLICT";
    public const string Unauthorized = "UNAUTHORIZED";
    public const string Forbidden = "FORBIDDEN";

    public const string ExternalServiceError = "EXTERNAL_SERVICE_ERROR";
    public const string ExternalServiceUnavailable = "EXTERNAL_SERVICE_UNAVAILABLE";
    public const string ExternalServiceTimeout = "EXTERNAL_SERVICE_TIMEOUT";

    public const string UnexpectedError = "UNEXPECTED_ERROR";
}
