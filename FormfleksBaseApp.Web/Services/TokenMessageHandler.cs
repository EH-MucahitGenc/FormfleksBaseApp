using System.Net.Http.Headers;
using FormfleksBaseApp.Web.Auth;

namespace FormfleksBaseApp.Web.Services;

public sealed class TokenMessageHandler : DelegatingHandler
{
    private readonly AuthTokenStore _tokenStore;

    public TokenMessageHandler(AuthTokenStore tokenStore)
    {
        _tokenStore = tokenStore;
    }

    protected override Task<HttpResponseMessage> SendAsync(HttpRequestMessage request, CancellationToken cancellationToken)
    {
        if (!string.IsNullOrWhiteSpace(_tokenStore.AccessToken))
            request.Headers.Authorization = new AuthenticationHeaderValue("Bearer", _tokenStore.AccessToken);

        return base.SendAsync(request, cancellationToken);
    }
}
