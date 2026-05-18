using Microsoft.AspNetCore.SignalR;
using System.Security.Claims;
using System.IdentityModel.Tokens.Jwt;

namespace FormfleksBaseApp.Api.Hubs;

public class CustomUserIdProvider : IUserIdProvider
{
    public string? GetUserId(HubConnectionContext connection)
    {
        // First try to get the ClaimTypes.NameIdentifier
        var userId = connection.User?.FindFirst(ClaimTypes.NameIdentifier)?.Value;
        
        // If not found, try to get the "sub" claim
        if (string.IsNullOrEmpty(userId))
        {
            userId = connection.User?.FindFirst(JwtRegisteredClaimNames.Sub)?.Value;
        }

        return userId;
    }
}
