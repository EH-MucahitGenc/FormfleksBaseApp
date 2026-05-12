using MediatR;
using System.Collections.Generic;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetDistinctLocations;

public class GetDistinctLocationsQuery : IRequest<List<string>>
{
}
