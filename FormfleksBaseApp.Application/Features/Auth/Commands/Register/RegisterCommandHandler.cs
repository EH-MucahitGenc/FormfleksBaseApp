using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.Auth.Commands.Register;

public sealed class RegisterCommandHandler : IRequestHandler<RegisterCommand, Unit>
{
    private const string ProviderLocal = "Local";
    private readonly IUserRepository _users;
    private readonly IPasswordHasher _hasher;
    private readonly IDynamicFormsDbContext _db;

    public RegisterCommandHandler(IUserRepository users, IPasswordHasher hasher, IDynamicFormsDbContext db)
    {
        _users = users;
        _hasher = hasher;
        _db = db;
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

        // 1) Assign Default "User" Role
        var defaultRole = await _db.Roles.FirstOrDefaultAsync(r => r.Name == "User" || r.Name == "Kullanıcı" || r.Name == "Personel", ct);
        if (defaultRole != null)
        {
            _db.UserRoles.Add(new UserRoleEntity { UserId = user.Id, RoleId = defaultRole.Id });
        }

        // 2) Auto-link to QdmsPersoneller by Email
        var personnel = await _db.QdmsPersoneller.FirstOrDefaultAsync(p => p.IsActive && p.Email != null && p.Email.ToLower() == email, ct);
        if (personnel != null)
        {
            personnel.LinkedUserId = user.Id;
            _db.QdmsPersoneller.Update(personnel);
        }

        await _db.SaveChangesAsync(ct);

        return Unit.Value;
    }
}
