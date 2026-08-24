using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Templates.Queries.GetTemplateDetails;

public record TemplateDetailOptionDto(Guid Id, string Label, int SortOrder);

public record TemplateDetailQuestionDto(
    Guid Id,
    int Type,
    string Title,
    string? Description,
    bool IsRequired,
    int SortOrder,
    string? SettingsJson,
    string? VisibilityRuleJson,
    List<TemplateDetailOptionDto>? Options
);

public record TemplateDetailSectionDto(
    Guid Id,
    string Title,
    string? Description,
    int SortOrder,
    List<TemplateDetailQuestionDto> Questions
);

public record TemplateDetailsDto(
    Guid Id,
    Guid VersionId,
    string Title,
    string? Description,
    bool DefaultIsAnonymous,
    List<TemplateDetailSectionDto> Sections
);

public record GetTemplateDetailsQuery(Guid Id) : IRequest<TemplateDetailsDto?>;

public class GetTemplateDetailsQueryHandler : IRequestHandler<GetTemplateDetailsQuery, TemplateDetailsDto?>
{
    private readonly ISurveyDbContext _context;

    public GetTemplateDetailsQueryHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<TemplateDetailsDto?> Handle(GetTemplateDetailsQuery request, CancellationToken cancellationToken)
    {
        var template = await _context.SurveyTemplates
            .Include(t => t.Versions)
                .ThenInclude(v => v.Sections)
                    .ThenInclude(s => s.Questions)
                        .ThenInclude(q => q.Options)
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);

        if (template == null) return null;

        var draftVersion = template.Versions.OrderByDescending(v => v.VersionNumber).FirstOrDefault();
        
        if (draftVersion == null) 
        {
            return new TemplateDetailsDto(template.Id, Guid.Empty, template.Title, template.Description, template.DefaultIsAnonymous, new List<TemplateDetailSectionDto>());
        }

        var sections = draftVersion.Sections.OrderBy(s => s.SortOrder).Select(s => new TemplateDetailSectionDto(
            s.Id,
            s.Title,
            s.Description,
            s.SortOrder,
            s.Questions.OrderBy(q => q.SortOrder).Select(q => new TemplateDetailQuestionDto(
                q.Id,
                (int)q.QuestionType,
                q.Title,
                q.Description,
                q.IsRequired,
                q.SortOrder,
                q.SettingsJson,
                q.VisibilityRuleJson,
                q.Options.OrderBy(o => o.SortOrder).Select(o => new TemplateDetailOptionDto(o.Id, o.Label, o.SortOrder)).ToList()
            )).ToList()
        )).ToList();

        return new TemplateDetailsDto(template.Id, draftVersion.Id, template.Title, template.Description, template.DefaultIsAnonymous, sections);
    }
}
