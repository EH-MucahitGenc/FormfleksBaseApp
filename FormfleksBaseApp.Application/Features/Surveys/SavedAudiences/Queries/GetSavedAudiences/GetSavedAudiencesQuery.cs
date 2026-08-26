using System.Collections.Generic;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.Surveys.Common;
using FormfleksBaseApp.Application.Features.Surveys.SavedAudiences.Dtos;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.Surveys.SavedAudiences.Queries.GetSavedAudiences;

public record GetSavedAudiencesQuery(Guid UserId) : IRequest<List<SavedAudienceDto>>;

public class GetSavedAudiencesQueryHandler : IRequestHandler<GetSavedAudiencesQuery, List<SavedAudienceDto>>
{
    private readonly ISurveyDbContext _context;

    public GetSavedAudiencesQueryHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<List<SavedAudienceDto>> Handle(GetSavedAudiencesQuery request, CancellationToken cancellationToken)
    {
        var list = await _context.SavedAudiences
            .Where(x => x.Active && (x.OwnerUserId == null || x.OwnerUserId == request.UserId))
            .OrderByDescending(x => x.CreatedAt)
            .ToListAsync(cancellationToken);

        return list.Select(x => new SavedAudienceDto
        {
            Id = x.Id,
            Name = x.Name,
            Description = x.Description,
            CreatedAt = x.CreatedAt,
            OwnerUserId = x.OwnerUserId,
            AudienceDefinition = JsonSerializer.Deserialize<AudienceFilter>(x.AudienceDefinitionJson) ?? new AudienceFilter()
        }).ToList();
    }
}
