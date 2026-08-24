using FormfleksBaseApp.Domain.Entities.Surveys;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface ISurveyDbContext
{
    DbSet<SurveyTemplate> SurveyTemplates { get; }
    DbSet<SurveyTemplateVersion> SurveyTemplateVersions { get; }
    DbSet<SurveyVersionSection> SurveyVersionSections { get; }
    DbSet<SurveyVersionQuestion> SurveyVersionQuestions { get; }
    DbSet<SurveyQuestionOption> SurveyQuestionOptions { get; }
    DbSet<SurveyCampaign> SurveyCampaigns { get; }
    DbSet<SurveyAssignment> SurveyAssignments { get; }
    DbSet<SurveyResponse> SurveyResponses { get; }
    DbSet<SurveyAnswer> SurveyAnswers { get; }
    DbSet<SurveyResultViewer> SurveyResultViewers { get; }
    DbSet<SurveyAnswerFile> SurveyAnswerFiles { get; }
    DbSet<SurveyParticipationGuard> SurveyParticipationGuards { get; }

    Microsoft.EntityFrameworkCore.Infrastructure.DatabaseFacade Database { get; }
    Task<int> SaveChangesAsync(CancellationToken cancellationToken = default);
}
