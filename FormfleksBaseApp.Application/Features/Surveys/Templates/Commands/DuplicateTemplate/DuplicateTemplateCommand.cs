using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.Surveys.Templates.Commands.DuplicateTemplate;

public record DuplicateTemplateCommand(Guid Id) : IRequest<Guid>;

public sealed class DuplicateTemplateCommandHandler : IRequestHandler<DuplicateTemplateCommand, Guid>
{
    private readonly ISurveyDbContext _context;

    public DuplicateTemplateCommandHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(DuplicateTemplateCommand request, CancellationToken cancellationToken)
    {
        var source = await _context.SurveyTemplates
            .AsNoTracking()
            .Include(template => template.Versions)
                .ThenInclude(version => version.Sections)
                    .ThenInclude(section => section.Questions)
                        .ThenInclude(question => question.Options)
            .FirstOrDefaultAsync(template => template.Id == request.Id, cancellationToken);

        if (source is null)
            throw new BusinessException("Kopyalanacak şablon bulunamadı.");

        var now = DateTime.UtcNow;
        var latestVersion = source.Versions.OrderByDescending(version => version.VersionNumber).FirstOrDefault();
        var copy = new SurveyTemplate
        {
            Title = BuildCopyTitle(source.Title),
            Description = source.Description,
            DefaultIsAnonymous = source.DefaultIsAnonymous,
            CreatedAt = now,
            Active = true
        };

        var copyVersion = new SurveyTemplateVersion
        {
            SurveyTemplateId = copy.Id,
            VersionNumber = 1,
            IsPublished = false,
            Notes = "Şablon kopyası",
            CreatedAt = now,
            Active = true
        };
        copy.Versions.Add(copyVersion);

        if (latestVersion is not null)
        {
            foreach (var sourceSection in latestVersion.Sections.OrderBy(section => section.SortOrder))
            {
                var section = new SurveyVersionSection
                {
                    SurveyTemplateVersionId = copyVersion.Id,
                    Title = sourceSection.Title,
                    Description = sourceSection.Description,
                    SortOrder = sourceSection.SortOrder,
                    CreatedAt = now,
                    Active = true
                };

                foreach (var sourceQuestion in sourceSection.Questions.OrderBy(question => question.SortOrder))
                {
                    var question = new SurveyVersionQuestion
                    {
                        SurveyVersionSectionId = section.Id,
                        QuestionType = sourceQuestion.QuestionType,
                        Title = sourceQuestion.Title,
                        Description = sourceQuestion.Description,
                        IsRequired = sourceQuestion.IsRequired,
                        SortOrder = sourceQuestion.SortOrder,
                        SettingsJson = sourceQuestion.SettingsJson,
                        VisibilityRuleJson = sourceQuestion.VisibilityRuleJson,
                        CreatedAt = now,
                        Active = true
                    };

                    foreach (var sourceOption in sourceQuestion.Options.OrderBy(option => option.SortOrder))
                    {
                        question.Options.Add(new SurveyQuestionOption
                        {
                            SurveyVersionQuestionId = question.Id,
                            Label = sourceOption.Label,
                            Value = sourceOption.Value,
                            SortOrder = sourceOption.SortOrder,
                            IsOtherOption = sourceOption.IsOtherOption,
                            CreatedAt = now,
                            Active = true
                        });
                    }

                    section.Questions.Add(question);
                }

                copyVersion.Sections.Add(section);
            }
        }

        _context.SurveyTemplates.Add(copy);
        await _context.SaveChangesAsync(cancellationToken);
        return copy.Id;
    }

    private static string BuildCopyTitle(string title)
    {
        const string suffix = " - Kopya";
        var safeTitle = title.Length + suffix.Length <= 200
            ? title
            : title[..(200 - suffix.Length)].TrimEnd();
        return safeTitle + suffix;
    }
}
