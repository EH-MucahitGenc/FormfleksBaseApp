using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.CreateCampaign;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.Surveys;
using FormfleksBaseApp.Domain.Enums.Surveys;
using FormfleksBaseApp.Infrastructure.Surveys.DataAccess;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace FormfleksBaseApp.Tests.Surveys
{
    public class CreateCampaignCommandTests
    {
        [Fact]
        public async Task Handle_ShouldCreateCampaign_WhenValidRequest()
        {
            // Arrange
            var options = new DbContextOptionsBuilder<SurveyDbContext>()
                .UseInMemoryDatabase(databaseName: Guid.NewGuid().ToString())
                .Options;

            using var context = new SurveyDbContext(options); // passing options

            var template = new SurveyTemplate { Id = Guid.NewGuid(), Title = "Test Template" };
            var templateVersion = new SurveyTemplateVersion { Id = Guid.NewGuid(), SurveyTemplateId = template.Id, IsPublished = false };
            template.Versions.Add(templateVersion);
            context.SurveyTemplates.Add(template);
            await context.SaveChangesAsync(CancellationToken.None);

            var mockServiceProvider = new Moq.Mock<IServiceProvider>();
            var handler = new CreateCampaignCommandHandler(context, mockServiceProvider.Object);

            var command = new CreateCampaignCommand(
                template.Id,
                "Test Campaign",
                "Test Desc",
                DateTime.UtcNow.AddDays(1),
                DateTime.UtcNow.AddDays(10),
                false,
                new List<Guid> { Guid.NewGuid() },
                null,
                false
            );

            // Act
            var result = await handler.Handle(command, CancellationToken.None);

            // Assert
            var campaign = await context.SurveyCampaigns.FirstOrDefaultAsync(c => c.Id == result);
            Assert.NotNull(campaign);
            Assert.Equal("Test Campaign", campaign.Title);
        }
    }
}
