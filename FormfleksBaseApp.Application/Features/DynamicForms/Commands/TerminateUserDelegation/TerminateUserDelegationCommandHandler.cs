using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.TerminateUserDelegation;

public class TerminateUserDelegationCommandHandler : IRequestHandler<TerminateUserDelegationCommand, bool>
{
    private readonly IDynamicFormsDbContext _db;

    public TerminateUserDelegationCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<bool> Handle(TerminateUserDelegationCommand request, CancellationToken cancellationToken)
    {
        var delegation = await _db.UserDelegations.FirstOrDefaultAsync(d => d.Id == request.DelegationId, cancellationToken);
        
        if (delegation == null)
            throw new BusinessException("Vekalet kaydı bulunamadı.");

        if (delegation.DelegatorUserId != request.ActorUserId)
            throw new BusinessException("Sadece kendi vekaletinizi sonlandırabilirsiniz.");

        delegation.IsActive = false;
        await _db.SaveChangesAsync(cancellationToken);

        return true;
    }
}
