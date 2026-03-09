using System.Text.Json;

namespace FormfleksBaseApp.Web.Auth;

public static class JwtTokenParser
{
    public static (Guid? userId, IReadOnlyList<string> roles, DateTime? expiration) Parse(string token)
    {
        try
        {
            var parts = token.Split('.');
            if (parts.Length < 2)
                return (null, [], null);

            var payload = parts[1]
                .Replace('-', '+')
                .Replace('_', '/');
            payload = payload.PadRight(payload.Length + (4 - payload.Length % 4) % 4, '=');

            var bytes = Convert.FromBase64String(payload);
            using var doc = JsonDocument.Parse(bytes);
            var root = doc.RootElement;

            Guid? userId = null;
            if (root.TryGetProperty("sub", out var subProp) && Guid.TryParse(subProp.GetString(), out var id))
                userId = id;

            var roles = new List<string>();
            ReadRoles(root, "role", roles);
            ReadRoles(root, "http://schemas.microsoft.com/ws/2008/06/identity/claims/role", roles);

            DateTime? expiration = null;
            if (root.TryGetProperty("exp", out var expProp) && expProp.TryGetInt64(out var expSeconds))
            {
                expiration = DateTimeOffset.FromUnixTimeSeconds(expSeconds).UtcDateTime;
            }

            return (userId, roles, expiration);
        }
        catch
        {
            return (null, [], null);
        }
    }

    private static void ReadRoles(JsonElement root, string claimName, List<string> roles)
    {
        if (!root.TryGetProperty(claimName, out var roleProp))
            return;

        if (roleProp.ValueKind == JsonValueKind.Array)
        {
            roles.AddRange(roleProp.EnumerateArray()
                .Select(x => x.GetString())
                .Where(x => !string.IsNullOrWhiteSpace(x))!
                .Cast<string>());
            return;
        }

        if (roleProp.ValueKind == JsonValueKind.String && !string.IsNullOrWhiteSpace(roleProp.GetString()))
            roles.Add(roleProp.GetString()!);
    }
}
