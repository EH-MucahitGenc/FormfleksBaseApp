using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.Surveys.Common;
using FormfleksBaseApp.Domain.Entities.Surveys;
using FormfleksBaseApp.Domain.Enums.Surveys;
using FormfleksBaseApp.Infrastructure.Surveys.DataAccess;
using Microsoft.EntityFrameworkCore;
using Moq;
using System;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace FormfleksBaseApp.Tests.Surveys;

public sealed class SurveyAuthorizationServiceTests
{
    private static SurveyDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<SurveyDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        return new SurveyDbContext(options);
    }

    [Fact]
    public async Task HasCampaignPermission_WhenGlobalAdmin_DeniesIdentifiedByDefault()
    {
        var campaignId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        
        var context = CreateContext();
        var currentUserService = new Mock<ICurrentUserService>();
        currentUserService.Setup(x => x.UserId).Returns(userId);
        currentUserService.Setup(x => x.HasPermission("Surveys.Results.ViewIdentified")).Returns(true);
        
        var service = new SurveyAuthorizationService(context, currentUserService.Object, SurveyTestUsers.Active());
        
        // Arrange campaign
        context.SurveyCampaigns.Add(new SurveyCampaign { Id = campaignId, OwnerUserId = Guid.NewGuid(), Title = "Test" });
        await context.SaveChangesAsync();

        // Act
        var result = await service.HasCampaignPermissionAsync(userId, campaignId, SurveyAction.ViewIdentifiedResponses, CancellationToken.None);

        // Assert - Admin should not have implicit identified access
        Assert.False(result);
    }

    [Fact]
    public async Task HasCampaignPermission_WhenViewer_WithDetailedAccess_AllowsIdentified()
    {
        var campaignId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        
        var context = CreateContext();
        var currentUserService = new Mock<ICurrentUserService>();
        currentUserService.Setup(x => x.UserId).Returns(userId);
        
        var service = new SurveyAuthorizationService(context, currentUserService.Object, SurveyTestUsers.Active());
        
        // Arrange
        context.SurveyCampaigns.Add(new SurveyCampaign { Id = campaignId, OwnerUserId = Guid.NewGuid(), Title = "Test" });
        context.SurveyResultViewers.Add(new SurveyResultViewer 
        { 
            Id = Guid.NewGuid(), 
            SurveyCampaignId = campaignId, 
            UserId = userId, 
            AccessLevel = SurveyViewerAccessLevel.Detailed 
        });
        await context.SaveChangesAsync();

        // Act
        var result = await service.HasCampaignPermissionAsync(userId, campaignId, SurveyAction.ViewIdentifiedResponses, CancellationToken.None);

        // Assert
        Assert.True(result);
    }
}
