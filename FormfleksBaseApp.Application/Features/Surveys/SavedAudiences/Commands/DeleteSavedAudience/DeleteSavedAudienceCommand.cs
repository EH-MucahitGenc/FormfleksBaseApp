using System;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.Surveys.SavedAudiences.Commands.DeleteSavedAudience;

public record DeleteSavedAudienceCommand(Guid Id, Guid UserId) : IRequest;

public class DeleteSavedAudienceCommandHandler : IRequestHandler<DeleteSavedAudienceCommand>
{
    private readonly ISurveyDbContext _context;

    public DeleteSavedAudienceCommandHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task Handle(DeleteSavedAudienceCommand request, CancellationToken cancellationToken)
    {
        var entity = await _context.SavedAudiences
            .FirstOrDefaultAsync(x => x.Id == request.Id, cancellationToken);

        if (entity == null || !entity.Active)
            throw new FormfleksBaseApp.Application.Common.NotFoundException("Saved audience not found.");

        // Only owner can delete their saved audience
        if (entity.OwnerUserId != null && entity.OwnerUserId != request.UserId)
            throw new System.UnauthorizedAccessException();

        entity.Active = false;
        await _context.SaveChangesAsync(cancellationToken);
    }
}
