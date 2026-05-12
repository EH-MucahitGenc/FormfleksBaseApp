using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using MediatR;
using Microsoft.EntityFrameworkCore;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Auth.Interfaces;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetUserDelegations;

public class GetUserDelegationsQueryHandler : IRequestHandler<GetUserDelegationsQuery, List<UserDelegationDto>>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IUserRepository _userRepository;

    public GetUserDelegationsQueryHandler(IDynamicFormsDbContext db, IUserRepository userRepository)
    {
        _db = db;
        _userRepository = userRepository;
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

        var result = new List<UserDelegationDto>();
        
        foreach (var d in delegations)
        {
            string finalName = "Bilinmeyen Kullanıcı";
            
            if (personeller.TryGetValue(d.DelegateeUserId, out var name))
            {
                finalName = name;
            }
            else
            {
                var fallbackUser = await _userRepository.GetByIdAsync(d.DelegateeUserId, cancellationToken, false);
                if (fallbackUser != null)
                {
                    finalName = !string.IsNullOrWhiteSpace(fallbackUser.DisplayName) ? fallbackUser.DisplayName : fallbackUser.Email;
                }
            }

            result.Add(new UserDelegationDto
            {
                Id = d.Id,
                DelegatorUserId = d.DelegatorUserId,
                DelegateeUserId = d.DelegateeUserId,
                DelegateeName = finalName,
                StartDate = d.StartDate,
                EndDate = d.EndDate,
                IsActive = d.IsActive,
                Reason = d.Reason,
                CreatedAt = d.CreatedAt
            });
        }

        return result;
    }
}
