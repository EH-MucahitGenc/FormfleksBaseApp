using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.Surveys;
using MediatR;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Templates.Commands.CreateTemplate;

public record CreateTemplateCommand(string Title, string? Description, bool DefaultIsAnonymous) : IRequest<Guid>;

public class CreateTemplateCommandHandler : IRequestHandler<CreateTemplateCommand, Guid>
{
    private readonly ISurveyDbContext _context;

    public CreateTemplateCommandHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateTemplateCommand request, CancellationToken cancellationToken)
    {
        var template = new SurveyTemplate
        {
            Id = Guid.NewGuid(),
            Title = request.Title,
            Description = request.Description,
            DefaultIsAnonymous = request.DefaultIsAnonymous
        };

        // Create the initial draft version (Version 1)
        var version = new SurveyTemplateVersion
        {
            Id = Guid.NewGuid(),
            SurveyTemplateId = template.Id,
            VersionNumber = 1,
            IsPublished = false,
            Notes = "Initial draft"
        };

        _context.SurveyTemplates.Add(template);
        _context.SurveyTemplateVersions.Add(version);
        
        await _context.SaveChangesAsync(cancellationToken);

        return template.Id;
    }
}
