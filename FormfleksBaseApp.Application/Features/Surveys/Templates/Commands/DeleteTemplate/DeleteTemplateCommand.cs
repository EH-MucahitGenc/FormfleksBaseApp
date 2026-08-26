using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.Surveys.Templates.Commands.DeleteTemplate;

public record DeleteTemplateCommand(Guid Id) : IRequest<bool>;

public sealed class DeleteTemplateCommandHandler : IRequestHandler<DeleteTemplateCommand, bool>
{
    private readonly ISurveyDbContext _context;

    public DeleteTemplateCommandHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<bool> Handle(DeleteTemplateCommand request, CancellationToken cancellationToken)
    {
        var template = await _context.SurveyTemplates
            .FirstOrDefaultAsync(item => item.Id == request.Id, cancellationToken);

        if (template is null)
            return false;

        var isUsedByCampaign = await _context.SurveyCampaigns
            .AnyAsync(campaign => campaign.SurveyTemplateVersion.SurveyTemplateId == request.Id, cancellationToken);

        if (isUsedByCampaign)
            throw new BusinessException("Bu şablon bir veya daha fazla kampanyada kullanıldığı için silinemez.");

        _context.SurveyTemplates.Remove(template);
        await _context.SaveChangesAsync(cancellationToken);
        return true;
    }
}
