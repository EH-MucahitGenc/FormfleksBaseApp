using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Domain.Entities;
using Microsoft.AspNetCore.Identity;

namespace FormfleksBaseApp.Api.Services;

public sealed class PasswordHasherAdapter : IPasswordHasher
{
    private readonly PasswordHasher<AppUser> _hasher = new();

    public string HashPassword(AppUser user, string password)
        => _hasher.HashPassword(user, password);

    public bool VerifyHashedPassword(AppUser user, string hashedPassword, string providedPassword)
        => _hasher.VerifyHashedPassword(user, hashedPassword, providedPassword) != PasswordVerificationResult.Failed;
}
