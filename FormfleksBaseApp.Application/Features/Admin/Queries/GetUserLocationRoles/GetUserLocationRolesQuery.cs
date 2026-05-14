using MediatR;
using System.Collections.Generic;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetUserLocationRoles;

public class GetUserLocationRolesQuery : IRequest<List<UserLocationRoleDto>>
{
}
