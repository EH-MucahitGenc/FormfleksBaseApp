using MediatR;
using System.Collections.Generic;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetHrAuthorizations;

public class GetHrAuthorizationsQuery : IRequest<List<HrAuthorizationDto>>
{
    // Opsiyonel olarak filtre eklenebilir, şu anlık hepsini getiriyoruz.
}
