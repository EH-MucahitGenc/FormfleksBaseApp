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
using MockQueryable.Moq;
using Moq;

namespace FormfleksBaseApp.Tests.Surveys
{
    public class CreateCampaignCommandTests
    {
        [Theory]
        [InlineData(0, null)]
        [InlineData(2, 3)]
        public async Task Publish_RejectsEmptyOrChangedAudience(int actual, int? expected)
        {
            using var context = new SurveyDbContext(new DbContextOptionsBuilder<SurveyDbContext>()
                .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options);
            var directory = new Mock<FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAudienceDirectory>();
            directory.Setup(d => d.GetTotalUsersCountAsync(It.IsAny<FormfleksBaseApp.Application.Features.Surveys.Common.AudienceFilter>(), It.IsAny<CancellationToken>())).ReturnsAsync(actual);
            var handler = new CreateCampaignCommandHandler(context, Mock.Of<IServiceProvider>(), Mock.Of<IDynamicFormsDbContext>(), directory.Object);
            var command = new CreateCampaignCommand(Guid.NewGuid(), "Test", "", DateTime.UtcNow, DateTime.UtcNow.AddDays(1), false,
                new() { SelectedUsersOnly = true }, null, false, Guid.NewGuid(), expected);
            await Assert.ThrowsAsync<FormfleksBaseApp.Application.Common.BusinessException>(() => handler.Handle(command, CancellationToken.None));
            Assert.Empty(context.SurveyCampaigns);
        }

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
            var mockDynamicFormsDb = new Moq.Mock<IDynamicFormsDbContext>();
            var mockAuditLogs = new List<FormfleksBaseApp.Domain.Entities.DynamicForms.AuditLogEntity>().AsQueryable().BuildMockDbSet();
            mockDynamicFormsDb.Setup(d => d.AuditLogs).Returns(mockAuditLogs.Object);

            var mockAudienceDir = new Moq.Mock<FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAudienceDirectory>();
            mockAudienceDir.Setup(x => x.GetTotalUsersCountAsync(Moq.It.IsAny<FormfleksBaseApp.Application.Features.Surveys.Common.AudienceFilter>(), Moq.It.IsAny<CancellationToken>()))
                .ReturnsAsync(1); // 1 expected participant

            var handler = new CreateCampaignCommandHandler(context, mockServiceProvider.Object, mockDynamicFormsDb.Object, mockAudienceDir.Object);

            var command = new CreateCampaignCommand(
                template.Id,
                "Test Campaign",
                "Test Desc",
                DateTime.UtcNow.AddDays(1),
                DateTime.UtcNow.AddDays(10),
                false,
                new FormfleksBaseApp.Application.Features.Surveys.Common.AudienceFilter { IncludedUserIds = new List<Guid> { Guid.NewGuid() } },
                null,
                false,
                Guid.NewGuid()
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
