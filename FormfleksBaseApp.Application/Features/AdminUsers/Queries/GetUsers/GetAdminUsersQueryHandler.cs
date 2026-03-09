using FormfleksBaseApp.Application.Features.AdminUsers.DTOs;
using FormfleksBaseApp.Application.Features.AdminUsers.Interfaces;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminUsers.Queries.GetUsers;

public sealed class GetAdminUsersQueryHandler : IRequestHandler<GetAdminUsersQuery, List<AdminUserDto>>
{
    private readonly IAdminUserRepository _repository;

    public GetAdminUsersQueryHandler(IAdminUserRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<AdminUserDto>> Handle(GetAdminUsersQuery request, CancellationToken ct)
    {
        var users = await _repository.GetAllUsersWithRolesAsync(ct);
        
        // Eğer liste tamamen boşsa, en azından mevcut sistemi ayakta tutmak için boş liste dönelim 
        // (Eski mapping NullReference fırlatıyordu, artık düzeltildi)
        return users.Select(u => new AdminUserDto
        {
            Id = u.Id,
            Name = u.DisplayName ?? u.Email,
            Email = u.Email,
            IsActive = u.Active,
            Roles = u.UserRoles?
                .Where(ur => ur.Role != null)
                .Select(ur => ur.Role.Name)
                .ToList() ?? new List<string>()
        }).ToList();
    }
}
