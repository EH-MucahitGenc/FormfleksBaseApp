using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.CreateCampaign;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.ProcessSurveyCampaigns;
using FormfleksBaseApp.Application.Features.Surveys.Common;
using FormfleksBaseApp.Domain.Entities.Surveys;
using FormfleksBaseApp.Domain.Enums.Surveys;
using FormfleksBaseApp.Infrastructure.Surveys.DataAccess;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;
using System.Text.Json;

namespace FormfleksBaseApp.Tests.Surveys;

public class SurveyCampaignDeliveryRegressionTests
{
    private static SurveyDbContext CreateContext() => new(
        new DbContextOptionsBuilder<SurveyDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);

    [Fact]
    public void OwnershipMapping_AcceptsNullsFromLegacyDatabaseRows()
    {
        using var context = CreateContext();
        var entity = context.Model.FindEntityType(typeof(SurveyCampaign))!;
        Assert.True(entity.FindProperty(nameof(SurveyCampaign.OwnerUserId))!.IsNullable);
        Assert.True(entity.FindProperty(nameof(SurveyCampaign.CreatedByUserId))!.IsNullable);
    }

    [Theory]
    [InlineData(false)]
    [InlineData(true)]
    public async Task Create_RequiresActorEvenThoughLegacyOwnershipIsNullable(bool draft)
    {
        using var context = CreateContext();
        var handler = new CreateCampaignCommandHandler(context, Mock.Of<IServiceProvider>(),
            Mock.Of<IDynamicFormsDbContext>(), Mock.Of<ISurveyAudienceDirectory>());
        var command = new CreateCampaignCommand(Guid.NewGuid(), "Test", "", DateTime.UtcNow,
            DateTime.UtcNow.AddDays(1), false, new() { SelectedUsersOnly = true },
            null, draft, Guid.Empty);
        await Assert.ThrowsAsync<BusinessException>(() => handler.Handle(command, CancellationToken.None));
        Assert.Empty(context.SurveyCampaigns);
    }

    [Fact]
    public async Task LegacyCampaign_DoesNotBlockSelectedAudienceDelivery_OrResendDeliveredInvitations()
    {
        using var context = CreateContext();
        var recipient = new SurveyAudienceUser { UserId = Guid.NewGuid(), DisplayName = "Test", Email = "test@example.com" };
        var filter = new AudienceFilter { SelectedUsersOnly = true, IncludedUserIds = new() { recipient.UserId } };
        var legacy = new SurveyCampaign
        {
            Id = Guid.NewGuid(), Title = "Legacy", Status = SurveyCampaignStatus.Published,
            EndDate = DateTime.UtcNow.AddDays(-1), CreatedByUserId = null, OwnerUserId = null
        };
        var campaign = new SurveyCampaign
        {
            Id = Guid.NewGuid(), Title = "Selected audience", Status = SurveyCampaignStatus.Scheduled,
            StartDate = DateTime.UtcNow.AddMinutes(-1), EndDate = DateTime.UtcNow.AddDays(1),
            TargetAudienceJson = JsonSerializer.Serialize(filter),
            CreatedByUserId = Guid.NewGuid(), OwnerUserId = Guid.NewGuid()
        };
        context.SurveyCampaigns.AddRange(legacy, campaign);
        await context.SaveChangesAsync();

        var directory = new Mock<ISurveyAudienceDirectory>(MockBehavior.Strict);
        directory.Setup(d => d.GetUsersAsync(It.Is<AudienceFilter>(f =>
                f.SelectedUsersOnly == true && f.IncludedUserIds!.SequenceEqual(new[] { recipient.UserId })),
                1, 100000, It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<SurveyAudienceUser> { recipient });
        directory.Setup(d => d.GetUsersByIdsAsync(It.Is<IEnumerable<Guid>>(ids =>
                ids.SequenceEqual(new[] { recipient.UserId })), It.IsAny<CancellationToken>()))
            .ReturnsAsync(new List<SurveyAudienceUser> { recipient });
        var email = new Mock<IEmailService>(MockBehavior.Strict);
        email.Setup(e => e.SendSurveyAssignmentEmailDirectAsync(recipient.Email, campaign.Title,
                It.IsAny<string>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);
        var handler = new ProcessSurveyCampaignsCommandHandler(context, Mock.Of<IDynamicFormsDbContext>(),
            email.Object, directory.Object, NullLogger<ProcessSurveyCampaignsCommandHandler>.Instance);

        await handler.Handle(new(), CancellationToken.None);
        await handler.Handle(new(), CancellationToken.None);

        Assert.Equal(SurveyCampaignStatus.Closed, legacy.Status);
        Assert.Equal(SurveyCampaignStatus.Published, campaign.Status);
        var assignment = Assert.Single(await context.SurveyAssignments.ToListAsync());
        Assert.Equal(recipient.UserId, assignment.UserId);
        Assert.Equal(campaign.Id, assignment.SurveyCampaignId);
        Assert.Equal(SurveyEmailDeliveryStatus.Delivered, assignment.EmailDeliveryStatus);
        Assert.Equal(SurveyAssignmentStatus.Sent, assignment.Status);
        email.Verify(e => e.SendSurveyAssignmentEmailDirectAsync(recipient.Email, campaign.Title,
            assignment.Token.ToString("N"), It.IsAny<CancellationToken>()), Times.Once);
    }
}
