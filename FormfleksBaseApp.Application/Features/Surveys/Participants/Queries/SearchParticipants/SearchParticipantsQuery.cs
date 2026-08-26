using FormfleksBaseApp.Application.Features.Surveys.Common;
using MediatR;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Participants.Queries.SearchParticipants;

public record PaginatedList<T>(List<T> Items, int TotalCount, int Page, int PageSize);

public record SearchParticipantsQuery(AudienceFilter Filter, int Page = 1, int PageSize = 10) : IRequest<PaginatedList<SurveyAudienceUser>>;

public class SearchParticipantsQueryHandler : IRequestHandler<SearchParticipantsQuery, PaginatedList<SurveyAudienceUser>>
{
    private readonly ISurveyAudienceDirectory _directory;

    public SearchParticipantsQueryHandler(ISurveyAudienceDirectory directory)
    {
        _directory = directory;
    }

    public async Task<PaginatedList<SurveyAudienceUser>> Handle(SearchParticipantsQuery request, CancellationToken cancellationToken)
    {
        var totalCount = await _directory.GetTotalUsersCountAsync(request.Filter, cancellationToken);
        var users = await _directory.GetUsersAsync(request.Filter, request.Page, request.PageSize, cancellationToken);

        return new PaginatedList<SurveyAudienceUser>(users, totalCount, request.Page, request.PageSize);
    }
}
