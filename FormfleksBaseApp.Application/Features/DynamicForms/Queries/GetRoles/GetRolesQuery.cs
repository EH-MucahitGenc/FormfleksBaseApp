using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetRoles;

public sealed record GetRolesQuery : IRequest<IReadOnlyList<RoleLookupDto>>;
