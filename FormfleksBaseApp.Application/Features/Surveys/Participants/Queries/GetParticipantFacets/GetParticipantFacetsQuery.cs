using FormfleksBaseApp.Application.Features.Surveys.Common;
using MediatR;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Participants.Queries.GetParticipantFacets;

public record GetParticipantFacetsQuery() : IRequest<AudienceFacets>;

public class GetParticipantFacetsQueryHandler : IRequestHandler<GetParticipantFacetsQuery, AudienceFacets>
{
    private readonly ISurveyAudienceDirectory _directory;

    public GetParticipantFacetsQueryHandler(ISurveyAudienceDirectory directory)
    {
        _directory = directory;
    }

    public async Task<AudienceFacets> Handle(GetParticipantFacetsQuery request, CancellationToken cancellationToken)
    {
        return await _directory.GetFacetsAsync(cancellationToken);
    }
}
