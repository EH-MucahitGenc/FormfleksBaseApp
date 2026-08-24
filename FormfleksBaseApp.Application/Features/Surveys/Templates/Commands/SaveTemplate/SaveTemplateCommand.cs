using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.Surveys;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Templates.Commands.SaveTemplate;

public record SaveTemplateOptionDto(Guid Id, string Label, int SortOrder);

public record SaveTemplateQuestionDto(
    Guid Id,
    int Type,
    string Title,
    string? Description,
    bool IsRequired,
    int SortOrder,
    string? SettingsJson,
    string? VisibilityRuleJson,
    List<SaveTemplateOptionDto>? Options
);

public record SaveTemplateSectionDto(
    Guid Id,
    string Title,
    string? Description,
    int SortOrder,
    List<SaveTemplateQuestionDto> Questions
);

public record SaveTemplateCommand(
    Guid Id,
    string Title,
    string? Description,
    bool DefaultIsAnonymous,
    List<SaveTemplateSectionDto> Sections
) : IRequest<FormfleksBaseApp.Application.Features.Surveys.Templates.Queries.GetTemplateDetails.TemplateDetailsDto>;

public class SaveTemplateCommandHandler : IRequestHandler<SaveTemplateCommand, FormfleksBaseApp.Application.Features.Surveys.Templates.Queries.GetTemplateDetails.TemplateDetailsDto>
{
    private readonly ISurveyDbContext _context;

    public SaveTemplateCommandHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<FormfleksBaseApp.Application.Features.Surveys.Templates.Queries.GetTemplateDetails.TemplateDetailsDto> Handle(SaveTemplateCommand request, CancellationToken cancellationToken)
    {
        using var transaction = await _context.Database.BeginTransactionAsync(cancellationToken);
        try 
        {
            var template = await _context.SurveyTemplates
                .Include(t => t.Versions)
                .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

            if (template == null) throw new FormfleksBaseApp.Application.Common.BusinessException("Şablon bulunamadı.");

            template.Title = request.Title;
            template.Description = request.Description;
            template.DefaultIsAnonymous = request.DefaultIsAnonymous;
            template.UpdatedAt = DateTime.UtcNow;

            var draftVersion = template.Versions.FirstOrDefault(v => !v.IsPublished);
            if (draftVersion == null)
            {
                draftVersion = new SurveyTemplateVersion
                {
                    Id = Guid.NewGuid(),
                    SurveyTemplateId = template.Id,
                    VersionNumber = template.Versions.Any() ? template.Versions.Max(v => v.VersionNumber) + 1 : 1,
                    IsPublished = false,
                    CreatedAt = DateTime.UtcNow
                };
                _context.SurveyTemplateVersions.Add(draftVersion);
            }

            var existingSections = await _context.SurveyVersionSections
                .Where(s => s.SurveyTemplateVersionId == draftVersion.Id)
                .ToListAsync(cancellationToken);
                
            var existingQuestions = await _context.SurveyVersionQuestions
                .Where(q => q.SurveyVersionSection.SurveyTemplateVersionId == draftVersion.Id)
                .ToListAsync(cancellationToken);
                
            var existingOptions = await _context.SurveyQuestionOptions
                .Where(o => o.SurveyVersionQuestion.SurveyVersionSection.SurveyTemplateVersionId == draftVersion.Id)
                .ToListAsync(cancellationToken);

            _context.SurveyQuestionOptions.RemoveRange(existingOptions);
            _context.SurveyVersionQuestions.RemoveRange(existingQuestions);
            _context.SurveyVersionSections.RemoveRange(existingSections); 
            
            var usedIds = new HashSet<Guid>();
            bool isNewDraft = existingSections.Count == 0;
            var oldToNewQuestionIds = new Dictionary<Guid, Guid>();

            // Determine which IDs are used by OTHER versions
            var otherVersionIdsList = await _context.SurveyVersionSections
                .Where(s => s.SurveyTemplateVersionId != draftVersion.Id && s.SurveyTemplateVersion.SurveyTemplateId == request.Id)
                .Select(s => s.Id)
                .Concat(_context.SurveyVersionQuestions
                    .Where(q => q.SurveyVersionSection.SurveyTemplateVersionId != draftVersion.Id && q.SurveyVersionSection.SurveyTemplateVersion.SurveyTemplateId == request.Id)
                    .Select(q => q.Id))
                .Concat(_context.SurveyQuestionOptions
                    .Where(o => o.SurveyVersionQuestion.SurveyVersionSection.SurveyTemplateVersionId != draftVersion.Id && o.SurveyVersionQuestion.SurveyVersionSection.SurveyTemplateVersion.SurveyTemplateId == request.Id)
                    .Select(o => o.Id))
                .ToListAsync(cancellationToken);
            var otherVersionIds = otherVersionIdsList.ToHashSet();

            // First pass: generate IDs
            foreach (var secDto in request.Sections)
            {
                var sectionId = (secDto.Id == Guid.Empty || isNewDraft || otherVersionIds.Contains(secDto.Id)) ? Guid.NewGuid() : secDto.Id;
                if (!usedIds.Add(sectionId)) sectionId = Guid.NewGuid();
                
                var section = new SurveyVersionSection
                {
                    Id = sectionId,
                    SurveyTemplateVersionId = draftVersion.Id,
                    Title = secDto.Title,
                    Description = secDto.Description,
                    SortOrder = secDto.SortOrder
                };
                _context.SurveyVersionSections.Add(section);

                foreach (var qDto in secDto.Questions)
                {
                    var qId = (qDto.Id == Guid.Empty || isNewDraft || otherVersionIds.Contains(qDto.Id)) ? Guid.NewGuid() : qDto.Id;
                    if (!usedIds.Add(qId)) qId = Guid.NewGuid();
                    oldToNewQuestionIds[qDto.Id] = qId;

                    var question = new SurveyVersionQuestion
                    {
                        Id = qId,
                        SurveyVersionSectionId = section.Id,
                        QuestionType = (SurveyQuestionType)qDto.Type,
                        Title = qDto.Title,
                        Description = qDto.Description,
                        IsRequired = qDto.IsRequired,
                        SortOrder = qDto.SortOrder,
                        SettingsJson = qDto.SettingsJson,
                        VisibilityRuleJson = qDto.VisibilityRuleJson
                    };
                    _context.SurveyVersionQuestions.Add(question);

                    if (qDto.Options != null)
                    {
                        foreach (var optDto in qDto.Options)
                        {
                            var oId = (optDto.Id == Guid.Empty || isNewDraft || otherVersionIds.Contains(optDto.Id)) ? Guid.NewGuid() : optDto.Id;
                            if (!usedIds.Add(oId)) oId = Guid.NewGuid();

                            var option = new SurveyQuestionOption
                            {
                                Id = oId,
                                SurveyVersionQuestionId = question.Id,
                                Label = optDto.Label,
                                SortOrder = optDto.SortOrder
                            };
                            _context.SurveyQuestionOptions.Add(option);
                        }
                    }
                }
            }

            // Second pass: Remap VisibilityRuleJson
            if (oldToNewQuestionIds.Count > 0)
            {
                foreach (var entity in _context.SurveyVersionQuestions.Local.Where(q => q.SurveyVersionSection?.SurveyTemplateVersionId == draftVersion.Id))
                {
                    if (!string.IsNullOrEmpty(entity.VisibilityRuleJson))
                    {
                        var updatedJson = entity.VisibilityRuleJson;
                        foreach (var kvp in oldToNewQuestionIds)
                        {
                            if (kvp.Key != kvp.Value)
                            {
                                updatedJson = updatedJson.Replace(kvp.Key.ToString(), kvp.Value.ToString(), StringComparison.OrdinalIgnoreCase);
                            }
                        }
                        entity.VisibilityRuleJson = updatedJson;
                    }
                }
            }

            await _context.SaveChangesAsync(cancellationToken);

            var queryHandler = new FormfleksBaseApp.Application.Features.Surveys.Templates.Queries.GetTemplateDetails.GetTemplateDetailsQueryHandler(_context);
            var updatedTemplate = await queryHandler.Handle(new FormfleksBaseApp.Application.Features.Surveys.Templates.Queries.GetTemplateDetails.GetTemplateDetailsQuery(request.Id), cancellationToken);

            await transaction.CommitAsync(cancellationToken);
            return updatedTemplate!;
        }
        catch
        {
            await transaction.RollbackAsync(cancellationToken);
            throw;
        }
    }
}
