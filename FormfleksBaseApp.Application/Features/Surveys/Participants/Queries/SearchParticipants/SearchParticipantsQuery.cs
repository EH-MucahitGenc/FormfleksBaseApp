using FormfleksBaseApp.Application.Features.Surveys.Common;
using MediatR;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using System.Linq;

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

public record BrowseParticipantsQuery(AudienceFilter DirectoryFilter, AudienceFilter AudienceDefinition, int Page = 1, int PageSize = 25)
    : IRequest<PaginatedList<AudienceCandidate>>;

public record AudienceCandidate(SurveyAudienceUser User, bool IsSelected);

public class BrowseParticipantsQueryHandler : IRequestHandler<BrowseParticipantsQuery, PaginatedList<AudienceCandidate>>
{
    private readonly ISurveyAudienceDirectory _directory;
    public BrowseParticipantsQueryHandler(ISurveyAudienceDirectory directory) => _directory = directory;

    public async Task<PaginatedList<AudienceCandidate>> Handle(BrowseParticipantsQuery request, CancellationToken cancellationToken)
    {
        var page = System.Math.Max(1, request.Page);
        var size = System.Math.Clamp(request.PageSize, 1, 100);
        var total = await _directory.GetTotalUsersCountAsync(request.DirectoryFilter, cancellationToken);
        var users = await _directory.GetUsersAsync(request.DirectoryFilter, page, size, cancellationToken);
        var selected = (await _directory.GetSelectedUserIdsAsync(request.AudienceDefinition, users.Select(u => u.UserId), cancellationToken)).ToHashSet();
        return new(users.Select(u => new AudienceCandidate(u, selected.Contains(u.UserId))).ToList(), total, page, size);
    }
}
