using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Templates.Commands.UpdateTemplate;

public record UpdateTemplateCommand(Guid Id, string Title, string? Description, bool DefaultIsAnonymous) : IRequest<bool>;

public class UpdateTemplateCommandHandler : IRequestHandler<UpdateTemplateCommand, bool>
{
    private readonly ISurveyDbContext _context;

    public UpdateTemplateCommandHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(UpdateTemplateCommand request, CancellationToken cancellationToken)
    {
        var template = await _context.SurveyTemplates.FirstOrDefaultAsync(t => t.Id == request.Id, cancellationToken);
        if (template == null) return false;

        template.Title = request.Title;
        template.Description = request.Description;
        template.DefaultIsAnonymous = request.DefaultIsAnonymous;

        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
