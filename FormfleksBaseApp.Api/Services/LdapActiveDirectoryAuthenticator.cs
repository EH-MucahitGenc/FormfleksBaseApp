using System.DirectoryServices.Protocols;
using System.Net;
using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Api.Options;
using Microsoft.Extensions.Options;

namespace FormfleksBaseApp.Api.Services;

public sealed class LdapActiveDirectoryAuthenticator : IActiveDirectoryAuthenticator
{
    private readonly LdapOptions _opt;

    public LdapActiveDirectoryAuthenticator(IOptions<LdapOptions> options)
    {
        _opt = options.Value;
    }

    public Task<AdUserInfo> AuthenticateAsync(string username, string password, CancellationToken ct)
    {
        ct.ThrowIfCancellationRequested();

        if (!_opt.IsActive)
            throw new BusinessException("LDAP is not active.");

        if (string.IsNullOrWhiteSpace(_opt.Host))
            throw new BusinessException("LDAP Host is missing.");

        if (string.IsNullOrWhiteSpace(_opt.BaseDn))
            throw new BusinessException("LDAP BaseDn is missing.");

        var userInput = username.Trim();

        // 1) Service bind + user DN bul
        var found = FindUserByServiceAccount(userInput);

        // 2) User bind ile password doğrula
        ValidateUserCredentials(found, userInput, password);

        // 3) Döndür
        return Task.FromResult(new AdUserInfo
        {
            Email = found.Email,
            DisplayName = found.DisplayName,
            ExternalId = found.ObjectGuid
        });
    }

    private LdapFoundUser FindUserByServiceAccount(string userInput)
    {
        if (string.IsNullOrWhiteSpace(_opt.ServiceUserName) || string.IsNullOrWhiteSpace(_opt.ServicePassword))
            throw new BusinessException("LDAP service account credentials are not configured.");

        using var conn = CreateConnection();

        // Service bind
        var serviceUpn = _opt.ServiceUserName!.Contains("@")
            ? _opt.ServiceUserName!
            : $"{_opt.ServiceUserName}@{_opt.Domain}";

        try
        {
            conn.AuthType = AuthType.Negotiate;
            conn.Credential = new NetworkCredential(serviceUpn, _opt.ServicePassword);
            conn.Bind();
        }
        catch (LdapException ex)
        {
            throw MapLdapException(ex, "LDAP service account bind failed.");
        }

        // Search user
        var filter = $"(&(objectClass=user)(|(userPrincipalName={Escape(userInput)})(sAMAccountName={Escape(userInput)})(mail={Escape(userInput)})))";

        var request = new SearchRequest(
            _opt.BaseDn,
            filter,
            SearchScope.Subtree,
            new[] { "distinguishedName", "mail", "userPrincipalName", "displayName", "objectGUID" }
        );

        SearchResponse response;
        try
        {
            response = (SearchResponse)conn.SendRequest(request);
        }
        catch (LdapException ex)
        {
            throw MapLdapException(ex, $"LDAP user search failed. Filter: {filter}, BaseDn: {_opt.BaseDn}.");
        }

        if (response.Entries.Count == 0)
            throw new BusinessException("User not found in Active Directory.");

        var entry = response.Entries[0];

        var dn = entry.DistinguishedName;
        if (string.IsNullOrWhiteSpace(dn))
            throw new BusinessException("User DN could not be resolved from Active Directory.");

        var userPrincipalName = GetString(entry, "userPrincipalName");
        var mail = GetString(entry, "mail") ?? userPrincipalName;
        if (string.IsNullOrWhiteSpace(mail))
            throw new BusinessException("User email not found in Active Directory (mail/userPrincipalName).");

        var displayName = GetString(entry, "displayName");
        var guid = GetGuidFromObjectGuid(entry);
        if (guid == Guid.Empty)
            throw new BusinessException("User objectGUID not found in Active Directory.");

        return new LdapFoundUser(
            DistinguishedName: dn,
            UserPrincipalName: userPrincipalName,
            Email: mail.Trim().ToLowerInvariant(),
            DisplayName: displayName,
            ObjectGuid: guid.ToString()
        );
    }

    private void ValidateUserCredentials(LdapFoundUser user, string userInput, string password)
    {
        if (string.IsNullOrWhiteSpace(password))
            throw new UnauthorizedAccessException("Active Directory credentials are invalid.");

        using var conn = CreateConnection();

        try
        {
            if (_opt.UseSsl)
            {
                // LDAPS'te simple bind en net yöntemdir.
                conn.AuthType = AuthType.Basic;
                conn.Credential = new NetworkCredential(user.DistinguishedName, password);
            }
            else
            {
                // SSL kapalıyken sunucu basic bind'i reddedebilir; Negotiate tercih et.
                var userName = NormalizeLoginName(userInput, user.UserPrincipalName);
                conn.AuthType = AuthType.Negotiate;
                conn.Credential = new NetworkCredential(userName, password);
            }

            conn.Bind();
        }
        catch (LdapException ex)
        {
            throw MapLdapException(ex, "LDAP user bind failed.");
        }
    }

    private LdapConnection CreateConnection()
    {
        var identifier = new LdapDirectoryIdentifier(_opt.Host, _opt.Port);
        var conn = new LdapConnection(identifier);

        conn.SessionOptions.ProtocolVersion = 3;
        conn.SessionOptions.ReferralChasing = ReferralChasingOptions.None;

        if (_opt.UseSsl)
            conn.SessionOptions.SecureSocketLayer = true;

        return conn;
    }

    private static string? GetString(SearchResultEntry entry, string attr)
    {
        if (!entry.Attributes.Contains(attr)) return null;
        var values = entry.Attributes[attr];
        if (values == null || values.Count == 0) return null;
        return values[0]?.ToString();
    }

    private static Guid GetGuidFromObjectGuid(SearchResultEntry entry)
    {
        if (!entry.Attributes.Contains("objectGUID")) return Guid.Empty;
        var values = entry.Attributes["objectGUID"];
        if (values == null || values.Count == 0) return Guid.Empty;

        if (values[0] is byte[] bytes && bytes.Length == 16)
            return new Guid(bytes);

        return Guid.Empty;
    }

    private static string Escape(string value)
        => value.Replace("\\", "\\5c")
                .Replace("*", "\\2a")
                .Replace("(", "\\28")
                .Replace(")", "\\29")
                .Replace("\0", "\\00");

    private static Exception MapLdapException(LdapException ex, string contextMessage)
    {
        // 49 => invalid credentials, 8 => strong auth required (SSL needed)
        return ex.ErrorCode switch
        {
            49 => new UnauthorizedAccessException("Active Directory credentials are invalid."),
            8 => new ExternalServiceException("LDAP", $"{contextMessage} LDAP server requires SSL/TLS (strong auth required)."),
            _ => new ExternalServiceException("LDAP", $"{contextMessage} LDAP error code: {ex.ErrorCode}. {ex.Message}")
        };
    }

    private string NormalizeLoginName(string userInput, string? userPrincipalName)
    {
        if (userInput.Contains('@') || userInput.Contains('\\'))
            return userInput;

        if (!string.IsNullOrWhiteSpace(userPrincipalName))
            return userPrincipalName!;

        if (!string.IsNullOrWhiteSpace(_opt.Domain))
            return $"{_opt.Domain}\\{userInput}";

        return userInput;
    }

    private sealed record LdapFoundUser(string DistinguishedName, string? UserPrincipalName, string Email, string? DisplayName, string ObjectGuid);
}
