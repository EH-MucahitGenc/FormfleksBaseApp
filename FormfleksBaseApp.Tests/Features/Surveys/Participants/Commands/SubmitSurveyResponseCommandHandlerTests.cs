using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.Surveys.Participants.Commands.SubmitSurveyResponse;
using FormfleksBaseApp.Domain.Entities.Surveys;
using FormfleksBaseApp.Domain.Enums.Surveys;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Diagnostics;
using Xunit;

namespace FormfleksBaseApp.Tests.Features.Surveys.Participants.Commands;

public class SubmitSurveyResponseCommandHandlerTests
{
    private ISurveyDbContext GetDbContext()
    {
        var options = new DbContextOptionsBuilder<FormfleksBaseApp.Infrastructure.Surveys.DataAccess.SurveyDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .ConfigureWarnings(x => x.Ignore(InMemoryEventId.TransactionIgnoredWarning))
            .Options;
            
        return new FormfleksBaseApp.Infrastructure.Surveys.DataAccess.SurveyDbContext(options);
    }

    [Fact]
    public async Task Handle_ShouldThrowNotFound_WhenTokenIsInvalid()
    {
        // Arrange
        var context = GetDbContext();
        var handler = new SubmitSurveyResponseCommandHandler(context);
        var command = new SubmitSurveyResponseCommand(Guid.NewGuid().ToString(), new List<SurveyAnswerDto>());

        // Act & Assert
        await Assert.ThrowsAsync<NotFoundException>(() => handler.Handle(command, CancellationToken.None));
    }

    [Fact]
    public async Task Handle_ShouldThrowConflict_WhenAlreadyCompleted()
    {
        // Arrange
        var context = GetDbContext();
        var handler = new SubmitSurveyResponseCommandHandler(context);
        
        var token = Guid.NewGuid();
        var assignment = new SurveyAssignment
        {
            Id = Guid.NewGuid(),
            Token = token,
            Status = SurveyAssignmentStatus.Completed,
            SurveyCampaign = new SurveyCampaign { Id = Guid.NewGuid() }
        };
        context.SurveyAssignments.Add(assignment);
        await context.SaveChangesAsync(CancellationToken.None);

        var command = new SubmitSurveyResponseCommand(token.ToString(), new List<SurveyAnswerDto>());

        // Act & Assert
        await Assert.ThrowsAsync<ConflictException>(() => handler.Handle(command, CancellationToken.None));
    }
}
