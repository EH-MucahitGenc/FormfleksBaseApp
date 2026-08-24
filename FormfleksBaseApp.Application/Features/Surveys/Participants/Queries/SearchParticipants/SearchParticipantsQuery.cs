using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Participants.Queries.SearchParticipants;

public record ParticipantDto(Guid? UserId, string Name, string Email, string Department, string Title);

public record SearchParticipantsQuery(string SearchTerm, int MaxResults = 50) : IRequest<List<ParticipantDto>>;

public class SearchParticipantsQueryHandler : IRequestHandler<SearchParticipantsQuery, List<ParticipantDto>>
{
    private readonly IDynamicFormsDbContext _context;

    public SearchParticipantsQueryHandler(IDynamicFormsDbContext context)
    {
        _context = context;
    }

    public async Task<List<ParticipantDto>> Handle(SearchParticipantsQuery request, CancellationToken cancellationToken)
    {
        if (string.IsNullOrWhiteSpace(request.SearchTerm) || request.SearchTerm.Length < 2)
            return new List<ParticipantDto>();

        var search = request.SearchTerm.ToLower();

        var qdmsResults = await _context.QdmsPersoneller
            .AsNoTracking()
            .Where(p => p.IsActive && p.LinkedUserId != null && (
                (p.Adi + " " + p.Soyadi).ToLower().Contains(search) || 
                (p.Email != null && p.Email.ToLower().Contains(search)) ||
                (p.Departman_Adi != null && p.Departman_Adi.ToLower().Contains(search)) ||
                (p.Pozisyon_Aciklamasi != null && p.Pozisyon_Aciklamasi.ToLower().Contains(search))))
            .Take(request.MaxResults)
            .ToListAsync(cancellationToken);

        return qdmsResults.Select(p => new ParticipantDto(
            p.LinkedUserId,
            (p.Adi + " " + p.Soyadi).Trim(),
            p.Email ?? "",
            p.Departman_Adi ?? "",
            p.Pozisyon_Aciklamasi ?? ""
        )).ToList();
    }
}
