using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.Surveys.Common;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignParticipants;

public sealed record CampaignParticipantDto(
    Guid Id,
    Guid UserId,
    string FullName,
    string Email,
    string? Company,
    string? Department,
    string? Location,
    string? JobTitle,
    string Status,
    string EmailDeliveryStatus,
    int EmailRetryCount,
    DateTime? LastEmailAttemptAt,
    string? EmailErrorMessage,
    DateTime? StartedAt,
    DateTime? CompletedAt,
    double? CompletionSeconds,
    Guid? ResponseId,
    string SnapshotSource);

public sealed record PaginatedList<T>(List<T> Items, int TotalCount, int Page, int PageSize)
{
    public int TotalPages => PageSize == 0 ? 0 : (int)Math.Ceiling((double)TotalCount / PageSize);
}

public sealed record GetCampaignParticipantsQuery(
    Guid CampaignId,
    int Page = 1,
    int PageSize = 25,
    string? Search = null,
    string? Status = null,
    string? Department = null,
    string? Location = null,
    Guid ActorUserId = default) : IRequest<PaginatedList<CampaignParticipantDto>>;

public sealed class GetCampaignParticipantsQueryHandler : IRequestHandler<GetCampaignParticipantsQuery, PaginatedList<CampaignParticipantDto>>
{
    private readonly ISurveyDbContext _surveyContext;
    private readonly ISurveyAudienceDirectory _audienceDirectory;
    private readonly ISurveyAuthorizationService _authService;

    public GetCampaignParticipantsQueryHandler(ISurveyDbContext surveyContext, ISurveyAudienceDirectory audienceDirectory, ISurveyAuthorizationService authService)
    {
        _surveyContext = surveyContext;
        _audienceDirectory = audienceDirectory;
        _authService = authService;
    }

    public async Task<PaginatedList<CampaignParticipantDto>> Handle(GetCampaignParticipantsQuery request, CancellationToken cancellationToken)
    {
        var campaign = await _surveyContext.SurveyCampaigns.AsNoTracking()
            .Where(c => c.Id == request.CampaignId)
            .Select(c => new { c.IsAnonymous })
            .SingleOrDefaultAsync(cancellationToken)
            ?? throw new FormfleksBaseApp.Application.Common.NotFoundException("Kampanya bulunamadı.");

        if (campaign.IsAnonymous)
            throw new FormfleksBaseApp.Application.Common.BusinessException("Anonim kampanyalarda katılımcı ve yanıt gezgini kullanılamaz.");

        var canViewResponses = await _authService.HasCampaignPermissionAsync(
            request.ActorUserId, request.CampaignId, SurveyAction.ViewIdentifiedResponses, cancellationToken);
        var canManageAudience = await _authService.HasCampaignPermissionAsync(
            request.ActorUserId, request.CampaignId, SurveyAction.ManageAudience, cancellationToken);
        if (!canViewResponses && !canManageAudience)
            throw new FormfleksBaseApp.Application.Common.BusinessException("Bu kampanyanın katılımcı listesini görüntüleme yetkiniz bulunmamaktadır.");

        var page = Math.Max(1, request.Page);
        var pageSize = Math.Clamp(request.PageSize, 10, 100);
        var assignmentsQuery = _surveyContext.SurveyAssignments.AsNoTracking()
            .Where(a => a.SurveyCampaignId == request.CampaignId);

        if (!string.IsNullOrWhiteSpace(request.Status) && Enum.TryParse<SurveyAssignmentStatus>(request.Status, true, out var parsedStatus))
            assignmentsQuery = assignmentsQuery.Where(a => a.Status == parsedStatus);
        if (!string.IsNullOrWhiteSpace(request.Department))
            assignmentsQuery = assignmentsQuery.Where(a => a.DepartmentSnapshot == request.Department);
        if (!string.IsNullOrWhiteSpace(request.Location))
            assignmentsQuery = assignmentsQuery.Where(a => a.LocationSnapshot == request.Location);

        if (!string.IsNullOrWhiteSpace(request.Search))
        {
            var search = request.Search.Trim();
            var normalizedSearch = search.ToLower();
            var legacyUsers = await _audienceDirectory.GetUsersAsync(new AudienceFilter { SearchTerm = search }, 1, 5000, cancellationToken);
            var legacyIds = legacyUsers.Select(x => x.UserId).ToList();
            assignmentsQuery = assignmentsQuery.Where(a =>
                a.ParticipantDisplayName.ToLower().Contains(normalizedSearch) ||
                a.ParticipantEmail.ToLower().Contains(normalizedSearch) ||
                legacyIds.Contains(a.UserId));
        }

        var totalCount = await assignmentsQuery.CountAsync(cancellationToken);
        var assignments = await assignmentsQuery.OrderByDescending(a => a.CompletedAt)
            .ThenBy(a => a.ParticipantDisplayName).ThenBy(a => a.Id)
            .Skip((page - 1) * pageSize).Take(pageSize).ToListAsync(cancellationToken);

        var assignmentIds = assignments.Select(a => a.Id).ToList();
        var responseIds = canViewResponses ? await _surveyContext.SurveyResponses.AsNoTracking()
            .Where(r => r.SurveyAssignmentId.HasValue && assignmentIds.Contains(r.SurveyAssignmentId.Value))
            .Select(r => new { AssignmentId = r.SurveyAssignmentId!.Value, r.Id })
            .ToDictionaryAsync(x => x.AssignmentId, x => x.Id, cancellationToken)
            : new Dictionary<Guid, Guid>();

        var missingSnapshotIds = assignments.Where(a => string.IsNullOrWhiteSpace(a.ParticipantDisplayName))
            .Select(a => a.UserId).Distinct().ToList();
        var fallbackUsers = missingSnapshotIds.Count == 0
            ? new Dictionary<Guid, SurveyAudienceUser>()
            : (await _audienceDirectory.GetUsersByIdsAsync(missingSnapshotIds, cancellationToken)).ToDictionary(u => u.UserId);

        var items = assignments.Select(a =>
        {
            fallbackUsers.TryGetValue(a.UserId, out var fallback);
            var startedAt = a.StartedAt ?? (a.Status is SurveyAssignmentStatus.Started or SurveyAssignmentStatus.Completed ? a.UpdatedAt : null);
            return new CampaignParticipantDto(
                a.Id,
                a.UserId,
                string.IsNullOrWhiteSpace(a.ParticipantDisplayName) ? fallback?.DisplayName ?? "Bilinmiyor" : a.ParticipantDisplayName,
                string.IsNullOrWhiteSpace(a.ParticipantEmail) ? fallback?.Email ?? "-" : a.ParticipantEmail,
                a.CompanySnapshot ?? fallback?.Company,
                a.DepartmentSnapshot ?? fallback?.Department,
                a.LocationSnapshot ?? fallback?.Location,
                a.JobTitleSnapshot ?? fallback?.Title,
                a.Status.ToString(),
                a.EmailDeliveryStatus.ToString(),
                a.EmailRetryCount,
                a.LastEmailAttemptAt,
                a.EmailErrorMessage,
                startedAt,
                a.CompletedAt,
                startedAt.HasValue && a.CompletedAt.HasValue ? Math.Round((a.CompletedAt.Value - startedAt.Value).TotalSeconds, 1) : null,
                responseIds.TryGetValue(a.Id, out var responseId) ? responseId : null,
                string.IsNullOrWhiteSpace(a.SnapshotSource) ? "LegacyCurrentFallback" : a.SnapshotSource);
        }).ToList();

        return new PaginatedList<CampaignParticipantDto>(items, totalCount, page, pageSize);
    }
}
