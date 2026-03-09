using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Contracts.Common;
using FormfleksBaseApp.Domain.Entities;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Visitors.Commands.CreateVisitor;

public sealed class CreateVisitorCommandHandler : IRequestHandler<CreateVisitorCommand, Result<Guid>>
{
    private readonly IVisitorRepository _repo;

    public CreateVisitorCommandHandler(IVisitorRepository repo)
    {
        _repo = repo;
    }

    public async Task<Result<Guid>> Handle(CreateVisitorCommand request, CancellationToken cancellationToken)
    {
        var entity = new VisitorEntity
        {
            FirstName = request.Request.FirstName,
            LastName = request.Request.LastName,
            CompanyName = request.Request.CompanyName,
            Purpose = request.Request.Purpose,
            VisitDate = request.Request.VisitDate.ToUniversalTime()
        };

        var id = await _repo.CreateVisitorAsync(entity, cancellationToken);
        return Result<Guid>.Success(id);
    }
}
