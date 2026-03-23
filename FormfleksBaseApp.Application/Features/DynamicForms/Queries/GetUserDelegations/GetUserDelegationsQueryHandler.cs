using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using FormfleksBaseApp.Application.Common.Interfaces;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetUserDelegations;

public class GetUserDelegationsQueryHandler : IRequestHandler<GetUserDelegationsQuery, List<UserDelegationDto>>
{
    private readonly IDynamicFormsDbContext _db;

    public GetUserDelegationsQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<List<UserDelegationDto>> Handle(GetUserDelegationsQuery request, CancellationToken cancellationToken)
    {
        var delegations = await _db.UserDelegations
            .AsNoTracking()
            .Where(d => d.DelegatorUserId == request.UserId)
            .OrderByDescending(d => d.CreatedAt)
            .ToListAsync(cancellationToken);

        if (!delegations.Any()) return new List<UserDelegationDto>();

        var delegateeIds = delegations.Select(d => d.DelegateeUserId).Distinct().ToList();

        var personeller = await _db.QdmsPersoneller
            .AsNoTracking()
            .Where(p => p.LinkedUserId != null && delegateeIds.Contains(p.LinkedUserId.Value))
            .ToDictionaryAsync(p => p.LinkedUserId!.Value, p => $"{p.Adi} {p.Soyadi}", cancellationToken);

        return delegations.Select(d => new UserDelegationDto
        {
            Id = d.Id,
            DelegatorUserId = d.DelegatorUserId,
            DelegateeUserId = d.DelegateeUserId,
            DelegateeName = personeller.TryGetValue(d.DelegateeUserId, out var name) ? name : "Bilinmeyen Kullanıcı",
            StartDate = d.StartDate,
            EndDate = d.EndDate,
            IsActive = d.IsActive,
            Reason = d.Reason,
            CreatedAt = d.CreatedAt
        }).ToList();
    }
}
