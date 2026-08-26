using System;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using FluentValidation;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.Surveys.Common;
using FormfleksBaseApp.Domain.Entities.Surveys;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Surveys.SavedAudiences.Commands.CreateSavedAudience;

public record CreateSavedAudienceCommand(string Name, string? Description, AudienceFilter AudienceDefinition, Guid UserId) : IRequest<Guid>;

public class CreateSavedAudienceCommandValidator : AbstractValidator<CreateSavedAudienceCommand>
{
    public CreateSavedAudienceCommandValidator()
    {
        RuleFor(x => x.Name).NotEmpty().MaximumLength(200);
        RuleFor(x => x.AudienceDefinition).NotNull();
    }
}

public class CreateSavedAudienceCommandHandler : IRequestHandler<CreateSavedAudienceCommand, Guid>
{
    private readonly ISurveyDbContext _context;

    public CreateSavedAudienceCommandHandler(ISurveyDbContext context)
    {
        _context = context;
    }

    public async Task<Guid> Handle(CreateSavedAudienceCommand request, CancellationToken cancellationToken)
    {
        var entity = new SavedAudience
        {
            Name = request.Name,
            Description = request.Description,
            AudienceDefinitionJson = JsonSerializer.Serialize(request.AudienceDefinition),
            OwnerUserId = request.UserId
        };

        _context.SavedAudiences.Add(entity);
        await _context.SaveChangesAsync(cancellationToken);

        return entity.Id;
    }
}
