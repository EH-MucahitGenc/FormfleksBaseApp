using System.IdentityModel.Tokens.Jwt;
using System.Security.Claims;
using System.Security.Cryptography;
using System.Text;
using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Domain.Entities;
using Microsoft.IdentityModel.Tokens;

namespace FormfleksBaseApp.Api.Services;

public sealed class TokenService : ITokenService
{
    private readonly IConfiguration _config;

    public TokenService(IConfiguration config)
    {
        _config = config;
    }

    public int RefreshTokenDays
    {
        get
        {
            var days = _config.GetValue<int>("Jwt:RefreshTokenDays");
            if (days <= 0)
                throw new InvalidOperationException("Jwt:RefreshTokenDays must be greater than 0.");

            return days;
        }
    }

    public string CreateAccessToken(AppUser user, IReadOnlyList<string>? roleCodes = null)
    {
        var issuer = _config["Jwt:Issuer"];
        var audience = _config["Jwt:Audience"];
        var keyStr = _config["Jwt:Key"] ?? throw new InvalidOperationException("Jwt:Key missing");

        var key = new SymmetricSecurityKey(Encoding.UTF8.GetBytes(keyStr));
        var creds = new SigningCredentials(key, SecurityAlgorithms.HmacSha256);

        var minutes = _config.GetValue<int>("Jwt:AccessTokenMinutes");
        if (minutes <= 0)
            throw new InvalidOperationException("Jwt:AccessTokenMinutes must be greater than 0.");

        var claims = new List<Claim>
        {
            new(JwtRegisteredClaimNames.Sub, user.Id.ToString()),
            new(JwtRegisteredClaimNames.Email, user.Email),
            new(JwtRegisteredClaimNames.Jti, Guid.NewGuid().ToString())
        };

        if (roleCodes is not null)
        {
            foreach (var role in roleCodes.Where(x => !string.IsNullOrWhiteSpace(x)))
                claims.Add(new Claim(ClaimTypes.Role, role));
        }

        var token = new JwtSecurityToken(
            issuer: issuer,
            audience: audience,
            claims: claims,
            notBefore: DateTime.UtcNow,
            expires: DateTime.UtcNow.AddMinutes(minutes),
            signingCredentials: creds
        );

        return new JwtSecurityTokenHandler().WriteToken(token);
    }

    public string CreateRefreshToken()
    {
        var bytes = RandomNumberGenerator.GetBytes(32);
        return Convert.ToBase64String(bytes);
    }

    public string HashToken(string token)
    {
        var bytes = SHA256.HashData(Encoding.UTF8.GetBytes(token));
        return Convert.ToBase64String(bytes);
    }
}
