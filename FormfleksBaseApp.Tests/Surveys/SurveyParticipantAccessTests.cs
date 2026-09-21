using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignParticipants;
using FormfleksBaseApp.Application.Features.Surveys.Common;
using FormfleksBaseApp.Domain.Constants;
using FormfleksBaseApp.Domain.Entities.Surveys;
using FormfleksBaseApp.Domain.Enums.Surveys;
using FormfleksBaseApp.Infrastructure.Surveys.DataAccess;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace FormfleksBaseApp.Tests.Surveys;

public class SurveyParticipantAccessTests
{
    [Theory]
    [InlineData("manager", true, false)]
    [InlineData("owner", true, false)]
    [InlineData("viewer", true, true)]
    [InlineData("other-publisher", false, false)]
    [InlineData("unprivileged-owner", false, false)]
    [InlineData("global-result-permission", false, false)]
    public async Task ParticipantList_SeparatesAudienceManagementFromResponseAccess(string role, bool allowed, bool seeResponse)
    {
        await using var context = new SurveyDbContext(new DbContextOptionsBuilder<SurveyDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
        var actor = Guid.NewGuid();
        var campaign = new SurveyCampaign
        {
            Id = Guid.NewGuid(), Title = "Test", IsAnonymous = false,
            OwnerUserId = role is "owner" or "unprivileged-owner" ? actor : Guid.NewGuid()
        };
        var assignment = new SurveyAssignment
        {
            Id = Guid.NewGuid(), SurveyCampaignId = campaign.Id, UserId = Guid.NewGuid(),
            ParticipantDisplayName = "Test User", ParticipantEmail = "test@example.com"
        };
        var unanswered = new SurveyAssignment
        {
            Id = Guid.NewGuid(), SurveyCampaignId = campaign.Id, UserId = Guid.NewGuid(),
            ParticipantDisplayName = "Another User", ParticipantEmail = "another@example.com"
        };
        var response = new SurveyResponse
        {
            Id = Guid.NewGuid(), SurveyCampaignId = campaign.Id, SurveyAssignmentId = assignment.Id
        };
        context.SurveyCampaigns.Add(campaign);
        context.SurveyAssignments.AddRange(assignment, unanswered);
        context.SurveyResponses.Add(response);
        if (role == "viewer")
            context.SurveyResultViewers.Add(new SurveyResultViewer
            {
                Id = Guid.NewGuid(), SurveyCampaignId = campaign.Id, UserId = actor,
                AccessLevel = SurveyViewerAccessLevel.Detailed
            });
        await context.SaveChangesAsync();

        var currentUser = new Mock<ICurrentUserService>();
        currentUser.Setup(u => u.UserId).Returns(actor);
        currentUser.Setup(u => u.HasPermission(It.IsAny<string>())).Returns((string permission) =>
            (role == "manager" && permission == AppPermissions.SurveysManage) ||
            ((role == "owner" || role == "other-publisher") && permission == AppPermissions.SurveysPublish) ||
            (role == "global-result-permission" && permission == "Surveys.Results.ViewIdentified"));
        var auth = new SurveyAuthorizationService(context, currentUser.Object, SurveyTestUsers.Active());
        var handler = new GetCampaignParticipantsQueryHandler(context, Mock.Of<ISurveyAudienceDirectory>(), auth);
        var query = new GetCampaignParticipantsQuery(campaign.Id, ActorUserId: actor);
        if (!allowed)
        {
            await Assert.ThrowsAsync<BusinessException>(() => handler.Handle(query, CancellationToken.None));
            return;
        }

        var result = await handler.Handle(query, CancellationToken.None);
        Assert.Equal(2, result.TotalCount);
        var answeredItem = Assert.Single(result.Items, i => i.Id == assignment.Id);
        Assert.Equal(seeResponse ? (Guid?)response.Id : null, answeredItem.ResponseId);
        Assert.Null(Assert.Single(result.Items, i => i.Id == unanswered.Id).ResponseId);
        Assert.Equal(seeResponse, await auth.HasCampaignPermissionAsync(actor, campaign.Id, SurveyAction.ViewIdentifiedResponses));
    }
}
