namespace FormfleksBaseApp.Application.Common;

public sealed class BusinessException : ApiException
{
    public BusinessException(string message)
        : base(400, ErrorCodes.BusinessRuleViolation, "Business rule violation", message) { }
}
