using FormfleksBaseApp.Application.Features.AdminUsers.DTOs;
using FormfleksBaseApp.Application.Features.AdminUsers.Interfaces;
using MediatR;

namespace FormfleksBaseApp.Application.Features.AdminUsers.Queries.GetRoles;

public sealed class GetAdminRolesQueryHandler : IRequestHandler<GetAdminRolesQuery, List<RoleDto>>
{
    private readonly IAdminUserRepository _repository;

    public GetAdminRolesQueryHandler(IAdminUserRepository repository)
    {
        _repository = repository;
    }

    public async Task<List<RoleDto>> Handle(GetAdminRolesQuery request, CancellationToken ct)
    {
        var roles = await _repository.GetActiveRolesAsync(ct);

        return roles.Select(r => new RoleDto { Id = r.Id, Name = r.Name }).ToList();
    }
}
