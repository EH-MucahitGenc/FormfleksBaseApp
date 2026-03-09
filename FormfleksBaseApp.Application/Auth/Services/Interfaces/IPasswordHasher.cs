using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Application.Auth.Interfaces;

public interface IPasswordHasher
{
    string HashPassword(AppUser user, string password);
    bool VerifyHashedPassword(AppUser user, string hashedPassword, string providedPassword);
}
