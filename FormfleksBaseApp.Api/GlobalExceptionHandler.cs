using FluentValidation;
using FormfleksBaseApp.Application.Common;
using Microsoft.AspNetCore.Diagnostics;
using Microsoft.AspNetCore.Mvc;

namespace FormfleksBaseApp.Api.ExceptionHandling;

public sealed class GlobalExceptionHandler : IExceptionHandler
{
    public async ValueTask<bool> TryHandleAsync(HttpContext httpContext, Exception exception, CancellationToken ct)
    {
        var env = httpContext.RequestServices.GetRequiredService<IHostEnvironment>();

        ProblemDetails pd;

        switch (exception)
        {
            case ValidationException vex:
                {
                    var errors = vex.Errors
                        .GroupBy(e => e.PropertyName)
                        .ToDictionary(g => g.Key, g => g.Select(x => x.ErrorMessage).ToArray());

                    var vpd = new ValidationProblemDetails(errors)
                    {
                        Status = 400,
                        Title = "Validation failed",
                        Detail = "One or more validation errors occurred.",
                        Instance = httpContext.Request.Path
                    };

                    vpd.Extensions["errorCode"] = ErrorCodes.ValidationFailed;
                    pd = vpd;
                    httpContext.Response.StatusCode = 400;
                    break;
                }

            case ApiException aex:
                {
                    pd = new ProblemDetails
                    {
                        Status = aex.StatusCode,
                        Title = aex.Title,
                        Detail = aex.Message,
                        Instance = httpContext.Request.Path
                    };

                    pd.Extensions["errorCode"] = aex.ErrorCode;

                    // ExternalServiceException ek bilgi
                    if (aex is ExternalServiceException esx)
                        pd.Extensions["service"] = esx.ServiceName;

                    httpContext.Response.StatusCode = aex.StatusCode;
                    break;
                }
            case UnauthorizedAccessException:
                {
                    pd = new ProblemDetails
                    {
                        Status = StatusCodes.Status401Unauthorized,
                        Title = "Unauthorized",
                        Detail = "Invalid credentials.",
                        Instance = httpContext.Request.Path
                    };
                    pd.Extensions["errorCode"] = ErrorCodes.Unauthorized;
                    httpContext.Response.StatusCode = StatusCodes.Status401Unauthorized;
                    break;
                }

            default:
                {
                    pd = new ProblemDetails
                    {
                        Status = 500,
                        Title = "Unexpected error",
                        Detail = env.IsDevelopment() ? exception.ToString() : "An unexpected error occurred.",
                        Instance = httpContext.Request.Path
                    };
                    pd.Extensions["errorCode"] = ErrorCodes.UnexpectedError;
                    httpContext.Response.StatusCode = 500;
                    break;
                }
        }

        // Trace + Correlation
        pd.Extensions["traceId"] = httpContext.TraceIdentifier;

        if (httpContext.Items.TryGetValue(FormfleksBaseApp.Api.Middlewares.CorrelationIdMiddleware.ItemKey, out var cid) && cid is not null)
            pd.Extensions["correlationId"] = cid.ToString();

        var svc = httpContext.RequestServices.GetRequiredService<IProblemDetailsService>();
        var written = await svc.TryWriteAsync(new ProblemDetailsContext
        {
            HttpContext = httpContext,
            ProblemDetails = pd,
            Exception = exception
        });

        if (!written)
        {
            httpContext.Response.ContentType = "application/problem+json";
            await httpContext.Response.WriteAsJsonAsync(pd, cancellationToken: ct);
        }

        return true;
    }
}
