using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.CreateCampaign;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.ProcessSurveyCampaigns;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.ExportCampaignResultsCsv;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignResults;
using FormfleksBaseApp.Application.Features.Surveys.Participants.Commands.SubmitSurveyResponse;
using FormfleksBaseApp.Domain.Entities.Surveys;
using FormfleksBaseApp.Domain.Enums.Surveys;
using FormfleksBaseApp.Infrastructure.Surveys.DataAccess;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using MockQueryable.Moq;
using Moq;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace FormfleksBaseApp.Tests.Surveys
{
    public class SurveyE2EIntegrationTests : IDisposable
    {
        private readonly SurveyDbContext _context;

        private readonly string _connectionString;

        public SurveyE2EIntegrationTests()
        {
            _connectionString = Environment.GetEnvironmentVariable("SURVEY_TEST_CONNECTION_STRING");
            
            if (string.IsNullOrEmpty(_connectionString))
            {
                var appSettingsPath = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "..", "..", "..", "..", "FormfleksBaseApp.Api", "appsettings.Development.json");
                if (System.IO.File.Exists(appSettingsPath))
                {
                    try
                    {
                        var json = System.IO.File.ReadAllText(appSettingsPath);
                        using var doc = System.Text.Json.JsonDocument.Parse(json);
                        var defaultConn = doc.RootElement.GetProperty("ConnectionStrings").GetProperty("Default").GetString();
                        if (!string.IsNullOrEmpty(defaultConn))
                        {
                            _connectionString = defaultConn.Replace("Database=formfleks_base_app", "Database=formfleks_base_app_test_e2e");
                        }
                    }
                    catch { /* ignore */ }
                }
            }
            
            if (string.IsNullOrEmpty(_connectionString))
            {
                // Fallback (expected to fail if postgres requires auth)
                _connectionString = "Host=localhost;Port=5432;Database=formfleks_base_app_test_e2e;Username=postgres;";
            }

            var options = new DbContextOptionsBuilder<SurveyDbContext>()
                .UseNpgsql(_connectionString)
                .Options;

            _context = new SurveyDbContext(options);
            _context.Database.EnsureDeleted();
            _context.Database.Migrate(); // Run migrations on test DB
        }

        private readonly List<Guid> _createdTemplateIds = new();
        private readonly List<Guid> _createdCampaignIds = new();
        private readonly List<Guid> _createdResponseIds = new();

        public void Dispose()
        {
            try
            {
                // Cleanup in correct order to avoid FK constraint violations
                var responses = _context.SurveyResponses.Where(r => _createdResponseIds.Contains(r.Id)).ToList();
                _context.SurveyResponses.RemoveRange(responses);
                
                var campaigns = _context.SurveyCampaigns.Where(c => _createdCampaignIds.Contains(c.Id)).ToList();
                _context.SurveyCampaigns.RemoveRange(campaigns);

                var templates = _context.SurveyTemplates.Where(t => _createdTemplateIds.Contains(t.Id)).ToList();
                _context.SurveyTemplates.RemoveRange(templates);
                
                _context.SaveChanges();
            }
            catch { }
            
            _context.Dispose();
        }

        [Fact]
        public async Task SurveyEndToEndScenario_ShouldWorkCorrectly()
        {
            // 1. Arrange & Create Template
            var templateId = Guid.NewGuid();
            var userId = Guid.NewGuid();
            
            _createdTemplateIds.Add(templateId);

            var template = new SurveyTemplate
            {
                Id = templateId,
                Title = "Test Template"
            };
            var version = new SurveyTemplateVersion
            {
                Id = Guid.NewGuid(),
                SurveyTemplateId = templateId,
                VersionNumber = 1,
                IsPublished = true,
                PublishedAt = DateTime.UtcNow
            };
            var section = new SurveyVersionSection
            {
                Id = Guid.NewGuid(),
                SurveyTemplateVersionId = version.Id,
                Title = "General",
                SortOrder = 1
            };
            var question = new SurveyVersionQuestion
            {
                Id = Guid.NewGuid(),
                SurveyVersionSectionId = section.Id,
                Title = "Rate us",
                QuestionType = SurveyQuestionType.Rating,
                IsRequired = true,
                SortOrder = 1
            };

            _context.SurveyTemplates.Add(template);
            _context.SurveyTemplateVersions.Add(version);
            _context.SurveyVersionSections.Add(section);
            _context.SurveyVersionQuestions.Add(question);
            await _context.SaveChangesAsync();

            // 2. Create Campaign (Immediate Publish)
            var createCmd = new CreateCampaignCommand(
                templateId,
                "Campaign",
                "Desc",
                DateTime.UtcNow,
                DateTime.UtcNow.AddDays(1),
                false,
                new FormfleksBaseApp.Application.Features.Surveys.Common.AudienceFilter { IncludedUserIds = new List<Guid> { userId } },
                new List<FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.CreateCampaign.CampaignViewerDto>(),
                false,
                userId);
            var mockServiceProvider = new Moq.Mock<IServiceProvider>();
            
            var mockQdmsUsers = new List<FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelAktarim> 
            {
                new FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelAktarim { LinkedUserId = userId, Email = "test@test.com" }
            }.AsQueryable().BuildMockDbSet();

            var dynamicFormsContextMock = new Mock<IDynamicFormsDbContext>();
            dynamicFormsContextMock.Setup(d => d.QdmsPersoneller).Returns(mockQdmsUsers.Object);
            
            var mockAuditLogs = new List<FormfleksBaseApp.Domain.Entities.DynamicForms.AuditLogEntity>().AsQueryable().BuildMockDbSet();
            dynamicFormsContextMock.Setup(d => d.AuditLogs).Returns(mockAuditLogs.Object);

            var mockAudienceDir = new Mock<FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAudienceDirectory>();
            mockAudienceDir.Setup(x => x.GetTotalUsersCountAsync(It.IsAny<FormfleksBaseApp.Application.Features.Surveys.Common.AudienceFilter>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(1);

            var createHandler = new CreateCampaignCommandHandler(_context, mockServiceProvider.Object, dynamicFormsContextMock.Object, mockAudienceDir.Object);
            var newCampaignId = await createHandler.Handle(createCmd, CancellationToken.None);
            _createdCampaignIds.Add(newCampaignId);

            var campaign = await _context.SurveyCampaigns.FirstOrDefaultAsync(c => c.Id == newCampaignId);
            Assert.NotNull(campaign);
            Assert.Equal(SurveyCampaignStatus.Published, campaign.Status);

            // Assignment is NOT generated yet!

            // 3. Process Campaigns (Outbox & Retry)
            var emailServiceMock = new Mock<IEmailService>();
            var audienceDirectoryMock = new Mock<FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAudienceDirectory>();

            // Mock audience to return the user
            audienceDirectoryMock.Setup(x => x.GetUsersAsync(It.IsAny<FormfleksBaseApp.Application.Features.Surveys.Common.AudienceFilter>(), It.IsAny<int>(), It.IsAny<int>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<FormfleksBaseApp.Application.Features.Surveys.Common.SurveyAudienceUser> {
                    new FormfleksBaseApp.Application.Features.Surveys.Common.SurveyAudienceUser { UserId = userId, Email = "test@test.com", DisplayName = "Test User" }
                });

            audienceDirectoryMock.Setup(x => x.GetUsersByIdsAsync(It.IsAny<List<Guid>>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(new List<FormfleksBaseApp.Application.Features.Surveys.Common.SurveyAudienceUser> {
                    new FormfleksBaseApp.Application.Features.Surveys.Common.SurveyAudienceUser { UserId = userId, Email = "test@test.com", DisplayName = "Test User" }
                });
            
            var processHandler = new ProcessSurveyCampaignsCommandHandler(_context, dynamicFormsContextMock.Object, emailServiceMock.Object, audienceDirectoryMock.Object, new NullLogger<ProcessSurveyCampaignsCommandHandler>());
            
            // Run process handler to GENERATE assignments first
            await processHandler.Handle(new ProcessSurveyCampaignsCommand(), CancellationToken.None);

            var assignment = await _context.SurveyAssignments.FirstOrDefaultAsync(a => a.SurveyCampaignId == campaign.Id);
            Assert.NotNull(assignment);
            Assert.Equal(SurveyAssignmentStatus.Pending, assignment.Status);

            // Mock email to fail first
            emailServiceMock.Setup(e => e.SendSurveyAssignmentEmailDirectAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ThrowsAsync(new Exception("SMTP Error"));

            // Run process handler to SEND emails (fails)
            await processHandler.Handle(new ProcessSurveyCampaignsCommand(), CancellationToken.None);
            
            await _context.Entry(assignment).ReloadAsync();
            Assert.Equal(SurveyEmailDeliveryStatus.Retry, assignment.EmailDeliveryStatus);

            // Now mock success
            emailServiceMock.Setup(e => e.SendSurveyAssignmentEmailDirectAsync(It.IsAny<string>(), It.IsAny<string>(), It.IsAny<string>(), It.IsAny<CancellationToken>()))
                .ReturnsAsync(true);
            
            await processHandler.Handle(new ProcessSurveyCampaignsCommand(), CancellationToken.None);
            
            await _context.Entry(assignment).ReloadAsync();
            Assert.Equal(SurveyEmailDeliveryStatus.Delivered, assignment.EmailDeliveryStatus);

            // 4. Fill Survey
            var submitCmd = new SubmitSurveyResponseCommand(assignment.Token.ToString("N"), new List<SurveyAnswerDto>
            {
                new SurveyAnswerDto(question.Id, null, 5, null)
            });
            var submitHandler = new SubmitSurveyResponseCommandHandler(_context);
            var result = await submitHandler.Handle(submitCmd, CancellationToken.None);

            Assert.True(result.Success);
            
            var responseEntity = await _context.SurveyResponses.FirstOrDefaultAsync(r => r.SurveyCampaignId == campaign.Id);
            if (responseEntity != null)
            {
                _createdResponseIds.Add(responseEntity.Id);
            }

            // Double submission should fail
            var doubleSubmitResult = await Assert.ThrowsAsync<FormfleksBaseApp.Application.Common.ConflictException>(() => submitHandler.Handle(submitCmd, CancellationToken.None));
            Assert.Contains("doldurdunuz", doubleSubmitResult.Message);

            // 5. Get Results
            var authServiceMock = new Mock<FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAuthorizationService>();
            authServiceMock.Setup(a => a.EnsureCampaignPermissionAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<SurveyAction>(), It.IsAny<CancellationToken>())).Returns(Task.CompletedTask);
            authServiceMock.Setup(a => a.HasCampaignPermissionAsync(It.IsAny<Guid>(), It.IsAny<Guid>(), It.IsAny<SurveyAction>(), It.IsAny<CancellationToken>())).ReturnsAsync(true);

            var getResultsHandler = new GetCampaignResultsQueryHandler(_context, new FormfleksBaseApp.Application.Features.Surveys.Common.SurveyAnonymousSuppressionService(), authServiceMock.Object);
            var results = await getResultsHandler.Handle(new GetCampaignResultsQuery(campaign.Id, userId), CancellationToken.None);
            
            Assert.Equal(1, results.TotalParticipants);
            Assert.Equal(1, results.TotalResponses);
            Assert.Equal(100.0, results.ResponseRate);

            var qStats = results.Questions.First();
            Assert.Equal(1, qStats.TotalAnswers);
            Assert.Contains(qStats.OptionStats, o => o.Label.StartsWith("5") && o.Count == 1);

            // 6. Export Results
            var exportHandler = new ExportCampaignResultsCsvQueryHandler(_context, audienceDirectoryMock.Object, new FormfleksBaseApp.Application.Features.Surveys.Common.SurveyAnonymousSuppressionService(), authServiceMock.Object, dynamicFormsContextMock.Object);
            var csvBytes = await exportHandler.Handle(new ExportCampaignResultsCsvQuery(campaign.Id, userId), CancellationToken.None);
            var csvString = System.Text.Encoding.UTF8.GetString(csvBytes);
            
            Assert.Contains("Katılımcı", csvString);
            Assert.Contains("5", csvString);

            // 7. Get Templates
            var getTemplatesHandler = new FormfleksBaseApp.Application.Features.Surveys.Templates.Queries.GetTemplates.GetTemplatesQueryHandler(_context);
            var templatesList = await getTemplatesHandler.Handle(new FormfleksBaseApp.Application.Features.Surveys.Templates.Queries.GetTemplates.GetTemplatesQuery(null, null), CancellationToken.None);
            Assert.NotEmpty(templatesList);

            // 8. Get Campaigns
            var getCampaignsHandler = new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaigns.GetCampaignsQueryHandler(_context);
            var campaignsList = await getCampaignsHandler.Handle(new FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaigns.GetCampaignsQuery(), CancellationToken.None);
            Assert.NotEmpty(campaignsList);
        }
    }
}
