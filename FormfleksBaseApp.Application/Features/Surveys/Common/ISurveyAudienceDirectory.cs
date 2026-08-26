using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Common;

public class SurveyAudienceUser
{
    public Guid UserId { get; set; }
    public string DisplayName { get; set; } = string.Empty;
    public string Email { get; set; } = string.Empty;
    public string Company { get; set; } = string.Empty;
    public string Location { get; set; } = string.Empty;
    public string Department { get; set; } = string.Empty;
    public string Title { get; set; } = string.Empty;
    public string PersonnelGroup { get; set; } = string.Empty;
    public bool HasOrganizationData { get; set; }
    public List<string> Roles { get; set; } = new();
}

public class AudienceFilter
{
    public string? SearchTerm { get; set; }
    public List<string>? Companies { get; set; }
    public List<string>? Locations { get; set; }
    public List<string>? Departments { get; set; }
    public List<string>? Titles { get; set; }
    public List<string>? PersonnelGroups { get; set; }
    public List<string>? Roles { get; set; }
    public bool? HasOrganizationData { get; set; }
    public List<Guid>? IncludedUserIds { get; set; }
    public List<Guid>? ExcludedUserIds { get; set; }
}

public class AudienceFacets
{
    public List<string> Companies { get; set; } = new();
    public List<string> Locations { get; set; } = new();
    public List<string> Departments { get; set; } = new();
    public List<string> Titles { get; set; } = new();
    public List<string> PersonnelGroups { get; set; } = new();
    public List<string> Roles { get; set; } = new();
}

public interface ISurveyAudienceDirectory
{
    Task<List<SurveyAudienceUser>> GetUsersAsync(AudienceFilter filter, int page, int pageSize, CancellationToken cancellationToken = default);
    Task<int> GetTotalUsersCountAsync(AudienceFilter filter, CancellationToken cancellationToken = default);
    Task<List<SurveyAudienceUser>> GetUsersByIdsAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken = default);
    Task<AudienceFacets> GetFacetsAsync(CancellationToken cancellationToken = default);
}
