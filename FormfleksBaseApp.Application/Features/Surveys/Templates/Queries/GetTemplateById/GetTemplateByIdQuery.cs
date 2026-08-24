using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.Surveys.Templates.Queries.GetTemplates;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Templates.Queries.GetTemplateById;

public record GetTemplateByIdQuery(Guid Id) : IRequest<TemplateDto?>;

public class GetTemplateByIdQueryHandler : IRequestHandler<GetTemplateByIdQuery, TemplateDto?>
{
    private readonly ISurveyDbContext _context;

    public GetTemplateByIdQueryHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<TemplateDto?> Handle(GetTemplateByIdQuery request, CancellationToken cancellationToken)
    {
        var template = await _context.SurveyTemplates
            .AsNoTracking()
            .Where(x => x.Id == request.Id)
            .Select(x => new TemplateDto(
                x.Id,
                x.Title,
                x.Description,
                x.DefaultIsAnonymous,
                x.Versions.Count(),
                x.CreatedAt
            ))
            .FirstOrDefaultAsync(cancellationToken);

        return template;
    }
}
