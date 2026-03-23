using System;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.CreateUserDelegation;

public class CreateUserDelegationCommandHandler : IRequestHandler<CreateUserDelegationCommand, Guid>
{
    private readonly IDynamicFormsDbContext _db;

    public CreateUserDelegationCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<Guid> Handle(CreateUserDelegationCommand request, CancellationToken cancellationToken)
    {
        if (request.StartDate >= request.EndDate)
            throw new BusinessException("Başlangıç tarihi bitiş tarihinden sonra olamaz.");

        if (request.DelegatorUserId == request.DelegateeUserId)
            throw new BusinessException("Kendi kendinize vekalet veremezsiniz.");

        // Çakışan aktif vekalet var mı kontrol et
        var hasConflict = await _db.UserDelegations.AnyAsync(d => 
            d.DelegatorUserId == request.DelegatorUserId && 
            d.IsActive && 
            d.StartDate < request.EndDate && d.EndDate > request.StartDate, 
            cancellationToken);

        if (hasConflict)
            throw new BusinessException("Belirtilen tarihler arasında zaten aktif bir vekaletiniz bulunmaktadır.");

        var entity = new UserDelegationEntity
        {
            DelegatorUserId = request.DelegatorUserId,
            DelegateeUserId = request.DelegateeUserId,
            StartDate = request.StartDate,
            EndDate = request.EndDate,
            Reason = request.Reason,
            IsActive = true
        };

        _db.UserDelegations.Add(entity);
        await _db.SaveChangesAsync(cancellationToken);

        return entity.Id;
    }
}
