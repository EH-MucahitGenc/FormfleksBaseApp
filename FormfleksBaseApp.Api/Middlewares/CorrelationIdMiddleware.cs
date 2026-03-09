using Microsoft.Extensions.Primitives;

namespace FormfleksBaseApp.Api.Middlewares;

public sealed class CorrelationIdMiddleware
{
    public const string HeaderName = "X-Correlation-Id";
    public const string ItemKey = "CorrelationId";

    private readonly RequestDelegate _next;
    private readonly ILogger<CorrelationIdMiddleware> _logger;

    public CorrelationIdMiddleware(RequestDelegate next, ILogger<CorrelationIdMiddleware> logger)
    {
        _next = next;
        _logger = logger;
    }

    public async Task Invoke(HttpContext context)
    {
        var cid = GetOrCreateCorrelationId(context);

        context.Items[ItemKey] = cid;
        context.Response.Headers[HeaderName] = cid;

        using (_logger.BeginScope(new Dictionary<string, object>
        {
            ["CorrelationId"] = cid
        }))
        {
            await _next(context);
        }
    }

    private static string GetOrCreateCorrelationId(HttpContext context)
    {
        if (context.Request.Headers.TryGetValue(HeaderName, out StringValues value) &&
            !StringValues.IsNullOrEmpty(value))
        {
            return value.ToString();
        }

        return Guid.NewGuid().ToString("N");
    }
}
