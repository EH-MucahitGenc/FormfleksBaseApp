using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignParticipants;

public record CampaignParticipantDto(
    Guid Id,
    Guid UserId,
    string FullName,
    string Email,
    string Status,
    string EmailDeliveryStatus,
    int EmailRetryCount,
    DateTime? LastEmailAttemptAt,
    string? EmailErrorMessage,
    DateTime? CompletedAt
);

public record PaginatedList<T>(List<T> Items, int TotalCount, int Page, int PageSize);

public record GetCampaignParticipantsQuery(
    Guid CampaignId, 
    int Page = 1, 
    int PageSize = 10, 
    string? Search = null, 
    string? Status = null) : IRequest<PaginatedList<CampaignParticipantDto>>;

public class GetCampaignParticipantsQueryHandler : IRequestHandler<GetCampaignParticipantsQuery, PaginatedList<CampaignParticipantDto>>
{
    private readonly ISurveyDbContext _surveyContext;
    private readonly IDynamicFormsDbContext _dynamicFormsContext;

    public GetCampaignParticipantsQueryHandler(ISurveyDbContext surveyContext, IDynamicFormsDbContext dynamicFormsContext)
    {
        _surveyContext = surveyContext;
        _dynamicFormsContext = dynamicFormsContext;
    }

    public async Task<PaginatedList<CampaignParticipantDto>> Handle(GetCampaignParticipantsQuery request, CancellationToken cancellationToken)
    {
        var assignmentsQuery = _surveyContext.SurveyAssignments
            .Where(a => a.SurveyCampaignId == request.CampaignId);

        if (!string.IsNullOrEmpty(request.Status) && Enum.TryParse<SurveyAssignmentStatus>(request.Status, true, out var parsedStatus))
        {
            assignmentsQuery = assignmentsQuery.Where(a => a.Status == parsedStatus);
        }

        List<Guid>? matchingUserIds = null;
        if (!string.IsNullOrEmpty(request.Search))
        {
            var searchLower = request.Search.ToLower();
            matchingUserIds = await _dynamicFormsContext.QdmsPersoneller
                .AsNoTracking()
                .Where(u => u.LinkedUserId != null && ((u.Adi + " " + u.Soyadi).ToLower().Contains(searchLower) || (u.Email != null && u.Email.ToLower().Contains(searchLower))))
                .Select(u => u.LinkedUserId!.Value)
                .ToListAsync(cancellationToken);
                
            assignmentsQuery = assignmentsQuery.Where(a => matchingUserIds.Contains(a.UserId));
        }

        var totalCount = await assignmentsQuery.CountAsync(cancellationToken);

        var assignments = await assignmentsQuery
            .OrderBy(a => a.Status)
            .Skip((request.Page - 1) * request.PageSize)
            .Take(request.PageSize)
            .ToListAsync(cancellationToken);

        var userIds = assignments.Select(a => a.UserId).Distinct().ToList();

        var userDict = await _dynamicFormsContext.QdmsPersoneller
            .AsNoTracking()
            .Where(u => u.LinkedUserId != null && userIds.Contains(u.LinkedUserId.Value))
            .ToDictionaryAsync(u => u.LinkedUserId!.Value, u => new { FullName = u.Adi + " " + u.Soyadi, u.Email }, cancellationToken);

        var result = new List<CampaignParticipantDto>();

        foreach (var a in assignments)
        {
            var user = userDict.GetValueOrDefault(a.UserId);
            result.Add(new CampaignParticipantDto(
                a.Id,
                a.UserId,
                user?.FullName ?? "Bilinmiyor",
                user?.Email ?? "-",
                a.Status.ToString(),
                a.EmailDeliveryStatus.ToString(),
                a.EmailRetryCount,
                a.LastEmailAttemptAt,
                a.EmailErrorMessage,
                a.CompletedAt
            ));
        }

        return new PaginatedList<CampaignParticipantDto>(result, totalCount, request.Page, request.PageSize);
    }
}
