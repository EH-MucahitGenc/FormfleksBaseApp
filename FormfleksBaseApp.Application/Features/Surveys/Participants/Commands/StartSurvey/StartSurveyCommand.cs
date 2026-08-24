using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Participants.Commands.StartSurvey;

public record StartSurveyCommand(Guid Token) : IRequest<bool>;

public class StartSurveyCommandHandler : IRequestHandler<StartSurveyCommand, bool>
{
    private readonly ISurveyDbContext _context;

    public StartSurveyCommandHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(StartSurveyCommand request, CancellationToken cancellationToken)
    {
        var assignment = await _context.SurveyAssignments
            .Include(a => a.SurveyCampaign)
            .FirstOrDefaultAsync(a => a.Token == request.Token, cancellationToken);

        if (assignment == null)
            throw new FormfleksBaseApp.Application.Common.NotFoundException("Geçersiz token.");

        var now = DateTime.UtcNow;

        if (assignment.SurveyCampaign.Status != SurveyCampaignStatus.Published ||
            assignment.SurveyCampaign.StartDate > now ||
            (assignment.SurveyCampaign.EndDate.HasValue && assignment.SurveyCampaign.EndDate.Value < now))
        {
            throw new FormfleksBaseApp.Application.Common.GoneException("Bu anket þu anda aktif deðil veya süresi dolmuþ.");
        }

        if (assignment.Status == SurveyAssignmentStatus.Completed)
            throw new FormfleksBaseApp.Application.Common.ConflictException("Bu anketi zaten doldurdunuz.");

        if (assignment.Status != SurveyAssignmentStatus.Started)
        {
            assignment.Status = SurveyAssignmentStatus.Started;
            await _context.SaveChangesAsync(cancellationToken);
        }

        return true;
    }
}
