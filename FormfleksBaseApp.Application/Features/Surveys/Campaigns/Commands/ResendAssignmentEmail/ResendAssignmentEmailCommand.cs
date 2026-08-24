using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Commands.ResendAssignmentEmail;

public record ResendAssignmentEmailCommand(Guid AssignmentId) : IRequest<bool>;

public class ResendAssignmentEmailCommandHandler : IRequestHandler<ResendAssignmentEmailCommand, bool>
{
    private readonly ISurveyDbContext _context;

    public ResendAssignmentEmailCommandHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(ResendAssignmentEmailCommand request, CancellationToken cancellationToken)
    {
        var assignment = await _context.SurveyAssignments
            .FirstOrDefaultAsync(a => a.Id == request.AssignmentId, cancellationToken);

        if (assignment == null)
            throw new FormfleksBaseApp.Application.Common.NotFoundException("Katılımcı bulunamadı.");

        if (assignment.Status == SurveyAssignmentStatus.Completed)
            throw new FormfleksBaseApp.Application.Common.ConflictException("Bu katılımcı anketi zaten tamamlamış.");

        // Reset email delivery state so the background worker picks it up again
        assignment.EmailDeliveryStatus = SurveyEmailDeliveryStatus.Queued;
        assignment.EmailRetryCount = 0;
        assignment.EmailErrorMessage = null;
        
        await _context.SaveChangesAsync(cancellationToken);

        return true;
    }
}
