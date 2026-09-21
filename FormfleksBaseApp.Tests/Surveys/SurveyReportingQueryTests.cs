using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignParticipants;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignSegments;
using FormfleksBaseApp.Application.Features.Surveys.Common;
using FormfleksBaseApp.Domain.Entities.Surveys;
using FormfleksBaseApp.Domain.Enums.Surveys;
using FormfleksBaseApp.Infrastructure.Surveys.DataAccess;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace FormfleksBaseApp.Tests.Surveys;

public sealed class SurveyReportingQueryTests
{
    [Fact]
    public async Task ParticipantExplorer_RejectsAnonymousCampaigns()
    {
        await using var context = CreateContext();
        var campaign = NewCampaign(isAnonymous: true);
        context.SurveyCampaigns.Add(campaign);
        await context.SaveChangesAsync();

        var handler = new GetCampaignParticipantsQueryHandler(context, Mock.Of<ISurveyAudienceDirectory>(), Mock.Of<FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAuthorizationService>());

        var exception = await Assert.ThrowsAsync<FormfleksBaseApp.Application.Common.BusinessException>(() =>
            handler.Handle(new GetCampaignParticipantsQuery(campaign.Id), CancellationToken.None));

        Assert.Contains("Anonim", exception.Message);
    }

    [Fact]
    public async Task AnonymousSegments_SuppressGroupsBelowMinimumSize()
    {
        await using var context = CreateContext();
        var campaign = NewCampaign(isAnonymous: true);
        context.SurveyCampaigns.Add(campaign);
        context.SurveyAssignments.AddRange(Enumerable.Range(0, 3).Select(index => NewAssignment(campaign.Id, "Finans", index < 2)));
        await context.SaveChangesAsync();

        var authServiceMock = new Mock<FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAuthorizationService>();
        authServiceMock.Setup(a => a.EnsureCampaignPermissionAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<SurveyAction>(), It.IsAny<CancellationToken>()))
                       .Returns(Task.CompletedTask);

        var handler = new GetCampaignSegmentsQueryHandler(context, new SurveyAnonymousSuppressionService(), authServiceMock.Object);
        var result = await handler.Handle(new GetCampaignSegmentsQuery(campaign.Id, "department", Guid.NewGuid()), CancellationToken.None);

        var segment = Assert.Single(result.Items);
        Assert.True(segment.IsSuppressed);
        Assert.Null(segment.Participants);
        Assert.Null(segment.Responses);
        Assert.Null(segment.ResponseRate);
    }

    [Fact]
    public async Task ParticipantExplorer_UsesServerPagingForLargeCampaigns()
    {
        await using var context = CreateContext();
        var campaign = NewCampaign(isAnonymous: false);
        context.SurveyCampaigns.Add(campaign);
        context.SurveyAssignments.AddRange(Enumerable.Range(0, 1_005).Select(index => NewAssignment(campaign.Id, "Operasyon", index % 2 == 0, index)));
        await context.SaveChangesAsync();

        var directory = new Mock<ISurveyAudienceDirectory>();
        directory.Setup(x => x.GetUsersByIdsAsync(It.IsAny<IEnumerable<Guid>>(), It.IsAny<CancellationToken>()))
            .ReturnsAsync([]);
        var auth = new Mock<ISurveyAuthorizationService>();
        auth.Setup(a => a.HasCampaignPermissionAsync(It.IsAny<Guid>(), campaign.Id, SurveyAction.ManageAudience, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var handler = new GetCampaignParticipantsQueryHandler(context, directory.Object, auth.Object);

        var result = await handler.Handle(new GetCampaignParticipantsQuery(campaign.Id, Page: 11, PageSize: 100), CancellationToken.None);

        Assert.Equal(1_005, result.TotalCount);
        Assert.Equal(11, result.TotalPages);
        Assert.Equal(5, result.Items.Count);
        Assert.All(result.Items, item => Assert.Equal("Operasyon", item.Department));
    }

    private static SurveyDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<SurveyDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        return new SurveyDbContext(options);
    }

    private static SurveyCampaign NewCampaign(bool isAnonymous) => new()
    {
        Id = Guid.NewGuid(),
        SurveyTemplateVersionId = Guid.NewGuid(),
        Title = "Raporlama testi",
        IsAnonymous = isAnonymous,
        Status = SurveyCampaignStatus.Published
    };

    private static SurveyAssignment NewAssignment(Guid campaignId, string department, bool completed, int index = 0) => new()
    {
        Id = Guid.NewGuid(),
        SurveyCampaignId = campaignId,
        UserId = Guid.NewGuid(),
        ParticipantDisplayName = $"Kullanıcı {index:0000}",
        ParticipantEmail = $"user{index}@example.com",
        DepartmentSnapshot = department,
        SnapshotAt = DateTime.UtcNow,
        SnapshotSource = "AppUser+QDMS",
        Status = completed ? SurveyAssignmentStatus.Completed : SurveyAssignmentStatus.Sent,
        CompletedAt = completed ? DateTime.UtcNow : null
    };
}
