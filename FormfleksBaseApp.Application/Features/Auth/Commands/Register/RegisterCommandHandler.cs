using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Domain.Entities;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Auth.Commands.Register;

public sealed class RegisterCommandHandler : IRequestHandler<RegisterCommand, Unit>
{
    private const string ProviderLocal = "Local";
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;

    public RegisterCommandHandler(IUserRepository users, IPasswordHasher hasher)
    {
        _users = users;
        _hasher = hasher;
    }

    public async Task<Unit> Handle(RegisterCommand request, CancellationToken ct)
    {
        var email = request.Request.Email.Trim().ToLowerInvariant();

        var existing = await _users.GetByEmailAsync(email, ct, track: false);
        if (existing is not null)
            throw new BusinessException("Email already registered.");

        var user = new AppUser
        {
            Email = email,
            AuthProvider = ProviderLocal
        };

        user.PasswordHash = _hasher.HashPassword(user, request.Request.Password);

        await _users.AddAsync(user, ct);
        await _users.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
