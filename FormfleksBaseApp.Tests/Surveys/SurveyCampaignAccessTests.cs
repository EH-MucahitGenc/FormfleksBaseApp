using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Access;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetMyViewableCampaigns;
using FormfleksBaseApp.Application.Features.Surveys.Common;
using FormfleksBaseApp.Domain.Constants;
using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.Domain.Entities.Surveys;
using FormfleksBaseApp.Domain.Enums.Surveys;
using FormfleksBaseApp.Infrastructure.Surveys.DataAccess;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace FormfleksBaseApp.Tests.Surveys;

internal static class SurveyTestUsers
{
    public static IUserRepository Active()
    {
        var users = new Mock<IUserRepository>();
        users.Setup(u => u.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>(), false))
            .ReturnsAsync((Guid id, CancellationToken _, bool _) => new AppUser { Id = id, Active = true });
        return users.Object;
    }
}

public class SurveyCampaignAccessTests
{
    [Fact]
    public void RoleCatalog_ContainsOnlyImplementedSurveyOperations()
    {
        var expected = new[] { "Surveys.Design", "Surveys.Manage", "Surveys.Publish",
            "Surveys.Results.Export", "Surveys.Results.ExportIdentified", "Surveys.Results.ViewFiles" };
        Assert.Equal(expected.OrderBy(x => x), AppPermissions.All.Where(p => p.Name.StartsWith("Surveys.")).Select(p => p.Name).OrderBy(x => x));
        Assert.DoesNotContain("ManageSurveySettings", Enum.GetNames<SurveyAction>());
    }

    private class TestContext() : SurveyDbContext(new DbContextOptionsBuilder<SurveyDbContext>()
        .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options)
    {
        public List<AuditLogEntity> Audits { get; } = new();
        public override async Task SaveAccessChangesAsync(AuditLogEntity audit, CancellationToken ct = default)
        {
            await SaveChangesAsync(ct);
            Audits.Add(audit);
        }
    }

    private static ICurrentUserService Current(Guid id, bool manager = false)
    {
        var current = new Mock<ICurrentUserService>();
        current.Setup(u => u.UserId).Returns(id);
        current.Setup(u => u.HasPermission(It.IsAny<string>())).Returns((string p) => manager && p == AppPermissions.SurveysManage);
        return current.Object;
    }

    [Theory]
    [InlineData("owner", true, false)]
    [InlineData("creator", true, false)]
    [InlineData("summary-viewer", true, false)]
    [InlineData("detailed-viewer", true, true)]
    [InlineData("revoked", false, false)]
    [InlineData("expired", false, false)]
    [InlineData("future", false, false)]
    [InlineData("inactive-grant", false, false)]
    [InlineData("manager", false, false)]
    public async Task ListAndResultAccess_AgreeWithoutGlobalResultPermissions(string role, bool canRead, bool detailed)
    {
        await using var context = new TestContext();
        var id = Guid.NewGuid();
        var campaign = new SurveyCampaign { Id = Guid.NewGuid(), Title = "Test" };
        if (role == "owner") campaign.OwnerUserId = id;
        else if (role == "creator") campaign.CreatedByUserId = id;
        else if (role != "manager") campaign.ResultViewers.Add(new SurveyResultViewer
        {
            UserId = id, SurveyCampaignId = campaign.Id,
            AccessLevel = role == "detailed-viewer" ? SurveyViewerAccessLevel.Detailed : SurveyViewerAccessLevel.AggregateOnly,
            RevokedAt = role == "revoked" ? DateTime.UtcNow.AddMinutes(-1) : null,
            ValidUntil = role == "expired" ? DateTime.UtcNow.AddMinutes(-1) : null,
            ValidFrom = role == "future" ? DateTime.UtcNow.AddDays(1) : null,
            Active = role != "inactive-grant"
        });
        context.SurveyCampaigns.Add(campaign);
        await context.SaveChangesAsync();
        var auth = new SurveyAuthorizationService(context, Current(id, role == "manager"), SurveyTestUsers.Active());
        var list = await new GetMyViewableCampaignsQueryHandler(context, auth).Handle(new(id), default);
        var navigation = await new GetSurveyNavigationQueryHandler(context, auth).Handle(new(id), default);
        Assert.Equal(canRead, navigation.CanViewResults);
        Assert.Equal(role == "manager", navigation.CanManage);
        Assert.False(navigation.CanDesign);
        Assert.False(navigation.CanPublish);
        Assert.Equal(canRead ? 1 : 0, list.Count);
        Assert.Equal(canRead, await auth.HasCampaignPermissionAsync(id, campaign.Id, SurveyAction.ViewAggregateResults));
        Assert.Equal(detailed, await auth.HasCampaignPermissionAsync(id, campaign.Id, SurveyAction.ViewIdentifiedResponses));
        Assert.False(await auth.HasCampaignPermissionAsync(id, campaign.Id, SurveyAction.ExportAggregateResults));
        campaign.IsAnonymous = true;
        await context.SaveChangesAsync();
        Assert.False(await auth.HasCampaignPermissionAsync(id, campaign.Id, SurveyAction.ViewIdentifiedResponses));
    }

    [Fact]
    public async Task Navigation_ParticipationAloneDoesNotGrantModuleAccess()
    {
        await using var context = new TestContext();
        var userId = Guid.NewGuid();
        var campaign = new SurveyCampaign { Id = Guid.NewGuid(), Title = "Test" };
        context.SurveyCampaigns.Add(campaign);
        context.SurveyAssignments.Add(new SurveyAssignment { SurveyCampaignId = campaign.Id, UserId = userId });
        await context.SaveChangesAsync();
        var auth = new SurveyAuthorizationService(context, Current(userId), SurveyTestUsers.Active());
        var result = await new GetSurveyNavigationQueryHandler(context, auth).Handle(new(userId), default);
        Assert.Equal(new SurveyNavigationDto(false, false, false, false), result);
    }

    [Theory]
    [InlineData(SurveyAction.DesignTemplate)]
    [InlineData(SurveyAction.PublishCampaign)]
    [InlineData(SurveyAction.ManageCampaign)]
    public async Task Navigation_UsesOperationPermissions_AndRejectsInactiveSessions(SurveyAction action)
    {
        await using var context = new TestContext();
        var id = Guid.NewGuid();
        var auth = new Mock<ISurveyAuthorizationService>();
        auth.Setup(a => a.IsActiveUserAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        auth.Setup(a => a.HasGlobalPermissionAsync(id, action, It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var handler = new GetSurveyNavigationQueryHandler(context, auth.Object);
        var result = await handler.Handle(new(id), default);
        Assert.Equal(action == SurveyAction.DesignTemplate, result.CanDesign);
        Assert.Equal(action == SurveyAction.PublishCampaign, result.CanPublish);
        Assert.Equal(action == SurveyAction.ManageCampaign, result.CanManage);
        Assert.False(result.CanViewResults);
        auth.Setup(a => a.IsActiveUserAsync(id, It.IsAny<CancellationToken>())).ReturnsAsync(false);
        Assert.Equal(new SurveyNavigationDto(false, false, false, false), await handler.Handle(new(id), default));
    }

    [Fact]
    public async Task Manager_CanGrantRevokeAndRestore_WithAudit_AndInactiveUsersLoseAccess()
    {
        await using var context = new TestContext();
        var actor = Guid.NewGuid();
        var target = new AppUser { Id = Guid.NewGuid(), Active = true };
        var users = new Mock<IUserRepository>();
        users.Setup(u => u.GetByIdAsync(It.IsAny<Guid>(), It.IsAny<CancellationToken>(), false))
            .ReturnsAsync((Guid id, CancellationToken _, bool _) => id == target.Id ? target : new AppUser { Id = id, Active = true });
        var campaign = new SurveyCampaign { Id = Guid.NewGuid(), Title = "Test", CreatedByUserId = target.Id };
        context.SurveyCampaigns.Add(campaign);
        await context.SaveChangesAsync();
        var managerAuth = new SurveyAuthorizationService(context, Current(actor, true), users.Object);
        var viewerAuth = new SurveyAuthorizationService(context, Current(target.Id), users.Object);
        var handler = new SetCampaignAccessCommandHandler(context, managerAuth, users.Object);
        var command = new SetCampaignAccessCommand(campaign.Id, target.Id, SurveyViewerAccessLevel.Detailed, false, "Role change", null, actor);
        await handler.Handle(command, default);
        Assert.True(await viewerAuth.HasCampaignPermissionAsync(target.Id, campaign.Id, SurveyAction.ViewIdentifiedResponses));
        await handler.Handle(command with { Revoke = true }, default);
        Assert.False(await viewerAuth.HasCampaignPermissionAsync(target.Id, campaign.Id, SurveyAction.ViewAggregateResults));
        Assert.Empty(await new GetMyViewableCampaignsQueryHandler(context, viewerAuth).Handle(new(target.Id), default));
        await handler.Handle(command, default);
        Assert.Single(context.SurveyResultViewers);
        Assert.Equal(3, context.Audits.Count);
        Assert.All(context.Audits, audit => Assert.Equal(actor, audit.ActorUserId));
        target.Active = false;
        Assert.False(await viewerAuth.HasCampaignPermissionAsync(target.Id, campaign.Id, SurveyAction.ViewAggregateResults));
        Assert.Empty(await new GetMyViewableCampaignsQueryHandler(context, viewerAuth).Handle(new(target.Id), default));
        await Assert.ThrowsAsync<BusinessException>(() => handler.Handle(command, default));
        await handler.Handle(command with { Revoke = true }, default);
    }

    [Fact]
    public async Task NonManager_CannotGrantAccess_AndMissingReasonIsRejected()
    {
        await using var context = new TestContext();
        var actor = Guid.NewGuid();
        var campaign = new SurveyCampaign { Id = Guid.NewGuid(), Title = "Test", OwnerUserId = actor };
        context.SurveyCampaigns.Add(campaign);
        await context.SaveChangesAsync();
        var users = SurveyTestUsers.Active();
        var command = new SetCampaignAccessCommand(campaign.Id, Guid.NewGuid(), SurveyViewerAccessLevel.Detailed, false, "Test", null, actor);
        var handler = new SetCampaignAccessCommandHandler(context, new SurveyAuthorizationService(context, Current(actor), users), users);
        await Assert.ThrowsAsync<BusinessException>(() => handler.Handle(command, default));
        handler = new(context, new SurveyAuthorizationService(context, Current(actor, true), users), users);
        await Assert.ThrowsAsync<BusinessException>(() => handler.Handle(command with { Reason = " " }, default));
        Assert.Empty(context.SurveyResultViewers);
        Assert.Empty(context.Audits);
    }
}
