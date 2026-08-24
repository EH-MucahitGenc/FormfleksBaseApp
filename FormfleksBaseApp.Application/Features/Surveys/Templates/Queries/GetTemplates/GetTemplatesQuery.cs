using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Templates.Queries.GetTemplates;

public record TemplateDto(Guid Id, string Title, string? Description, bool DefaultIsAnonymous, int VersionCount, DateTime CreatedAt);

public record GetTemplatesQuery(string? SearchTerm, bool? ActiveOnly) : IRequest<List<TemplateDto>>;

public class GetTemplatesQueryHandler : IRequestHandler<GetTemplatesQuery, List<TemplateDto>>
{
    private readonly ISurveyDbContext _context;

    public GetTemplatesQueryHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<List<TemplateDto>> Handle(GetTemplatesQuery request, CancellationToken cancellationToken)
    {
        var query = _context.SurveyTemplates.AsNoTracking();

        if (request.ActiveOnly == true)
        {
            query = query.Where(x => x.Active);
        }

        if (!string.IsNullOrWhiteSpace(request.SearchTerm))
        {
            var search = request.SearchTerm.ToLower();
            query = query.Where(x => x.Title.ToLower().Contains(search) || (x.Description != null && x.Description.ToLower().Contains(search)));
        }

        var results = await query
            .OrderByDescending(x => x.CreatedAt)
            .Select(x => new TemplateDto(
                x.Id,
                x.Title,
                x.Description,
                x.DefaultIsAnonymous,
                x.Versions.Count(),
                x.CreatedAt
            ))
            .ToListAsync(cancellationToken);

        return results;
    }
}
