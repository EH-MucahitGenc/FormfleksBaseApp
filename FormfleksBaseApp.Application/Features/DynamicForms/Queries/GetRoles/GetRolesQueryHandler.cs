using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Services;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetRoles;

public sealed class GetRolesQueryHandler : IRequestHandler<GetRolesQuery, IReadOnlyList<FormTemplateRoleDto>>
{
    private readonly IFormTemplateAdminService _service;

    public GetRolesQueryHandler(IFormTemplateAdminService service)
    {
        _service = service;
    }

    public async Task<IReadOnlyList<FormTemplateRoleDto>> Handle(GetRolesQuery request, CancellationToken ct)
    {
        var roles = await _service.GetRolesAsync(ct);
        return roles;
    }
}
