using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetPendingApprovals;

public sealed class GetPendingApprovalsQueryHandler : IRequestHandler<GetPendingApprovalsQuery, IReadOnlyList<PendingApprovalListItemDto>>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly ILogger<GetPendingApprovalsQueryHandler> _logger;
    private readonly IUserRepository _userRepository;

    public GetPendingApprovalsQueryHandler(
        IDynamicFormsDbContext db, 
        ILogger<GetPendingApprovalsQueryHandler> logger,
        IUserRepository userRepository)
    {
        _db = db;
        _logger = logger;
        _userRepository = userRepository;
    }

    public async Task<IReadOnlyList<PendingApprovalListItemDto>> Handle(GetPendingApprovalsQuery request, CancellationToken ct)
    {
        var userRoleIds = await _db.UserRoles
            .AsNoTracking()
            .Where(ur => ur.UserId == request.ActorUserId)
            .Select(ur => ur.RoleId)
            .ToListAsync(ct);

        var userLocationRoleIds = await _db.UserLocationRoles
            .AsNoTracking()
            .Where(lr => lr.UserId == request.ActorUserId && lr.IsActive)
            .Select(lr => lr.RoleId)
            .ToListAsync(ct);

        userRoleIds.AddRange(userLocationRoleIds);
        userRoleIds = userRoleIds.Distinct().ToList();

        // We do NOT return empty here if userRoleIds.Count == 0!
        // A user might have 0 application-level roles but STILL have pending forms 
        // assigned to them directly via their Organizational Hierarchy (AssigneeUserId).

        var dbApprovals = await _db.FormRequestApprovals.AsNoTracking()
            .Where(a => a.Status == (short)ApprovalStatus.Pending)
            .ToListAsync(ct);

        _logger.LogWarning("DIAGNOSTICS: Fetching pending approvals for ActorUserId: {ActorId}. Total Pending in entire DB: {DbCount}", request.ActorUserId, dbApprovals.Count);
        
        foreach (var appTest in dbApprovals)
        {
            _logger.LogWarning("DIAGNOSTICS: Found Pending Approval ID: {AppId}, RequestId: {ReqId}, AssigneeUserId: {AssigneeUserId}", appTest.Id, appTest.RequestId, appTest.AssigneeUserId);
            if (appTest.AssigneeUserId == request.ActorUserId) {
                _logger.LogWarning("DIAGNOSTICS: -> MATCH FOUND for Actor {ActorId} on Approval {AppId}!", request.ActorUserId, appTest.Id);
            }
        }



        var result = await (from app in _db.FormRequestApprovals.AsNoTracking()
                      join r in _db.FormRequests.AsNoTracking() on app.RequestId equals r.Id
                      join ws in _db.WorkflowSteps.AsNoTracking() on app.WorkflowStepId equals ws.Id
                      join t in _db.FormTypes.AsNoTracking() on r.FormTypeId equals t.Id
                      join p in _db.QdmsPersoneller.AsNoTracking() on r.RequestorUserId equals p.LinkedUserId into personeller
                      from person in personeller.DefaultIfEmpty()
                      where app.Status == (short)ApprovalStatus.Pending
                      && (
                          app.AssigneeUserId == request.ActorUserId 
                          || (app.AssigneeRoleId.HasValue && userRoleIds.Contains(app.AssigneeRoleId.Value))
                          || (ws.AssigneeType == 15 && ws.TargetLocationRoleId.HasValue && _db.UserLocationRoles.Any(lr => lr.UserId == request.ActorUserId && lr.IsActive && lr.RoleId == ws.TargetLocationRoleId && (lr.IsGlobalManager || (person != null && lr.LocationName == person.Isyeri_Tanimi))))
                          || (ws.AssigneeType == 16 && ws.TargetLocationRoleId.HasValue && _db.UserLocationRoles.Any(lr => lr.UserId == request.ActorUserId && lr.IsActive && lr.RoleId == ws.TargetLocationRoleId && lr.IsGlobalManager))
                      )
                      orderby app.StepNo ascending, r.CreatedAt ascending
                      select new PendingApprovalListItemDto
                      {
                          ApprovalId = app.Id,
                          RequestId = r.Id,
                          RequestNo = r.RequestNo,
                          StepNo = app.StepNo,
                          AssigneeUserId = app.AssigneeUserId,
                          AssigneeRoleId = app.AssigneeRoleId,
                          RequestorUserId = r.RequestorUserId,
                          RequestorName = person != null ? person.Adi + " " + person.Soyadi : "Bilinmiyor",
                          FormTypeName = t.Name,
                          ApprovalConcurrencyToken = app.ConcurrencyToken,
                          CreatedAt = r.CreatedAt
                      }).ToListAsync(ct);

        // Fallback for "Bilinmiyor"
        var missingNameUserIds = result.Where(x => x.RequestorName == "Bilinmiyor").Select(x => x.RequestorUserId).Distinct().ToList();
        if (missingNameUserIds.Any())
        {
            foreach (var reqUserId in missingNameUserIds)
            {
                var appUser = await _userRepository.GetByIdAsync(reqUserId, ct, track: false);
                if (appUser != null)
                {
                    var fallbackName = !string.IsNullOrWhiteSpace(appUser.DisplayName) ? appUser.DisplayName : appUser.Email;
                    foreach (var item in result.Where(x => x.RequestorUserId == reqUserId))
                    {
                        item.RequestorName = fallbackName;
                    }
                }
            }
        }

        // Fetch Subject Person Name from FormRequestValues
        if (result.Any())
        {
            var requestIds = result.Select(r => r.RequestId).ToList();
            var formValues = await (from v in _db.FormRequestValues.AsNoTracking()
                                    join f in _db.FormFields.AsNoTracking() on v.FieldId equals f.Id
                                    where requestIds.Contains(v.RequestId)
                                    select new { v.RequestId, v.ValueText, f.FieldKey, f.Label }).ToListAsync(ct);

            var groupedValues = formValues.GroupBy(x => x.RequestId).ToDictionary(g => g.Key, g => g.ToList());

            foreach (var item in result)
            {
                if (groupedValues.TryGetValue(item.RequestId, out var values))
                {
                    var subjectField = values.FirstOrDefault(v => 
                        (v.FieldKey == "adi_soyadi" || v.FieldKey == "ad_soyad" || v.FieldKey == "personel_adi" || v.FieldKey == "calisan_adi" || v.FieldKey == "personel")
                        || (v.Label != null && (
                            v.Label.Contains("Adı", StringComparison.OrdinalIgnoreCase) && v.Label.Contains("Soyadı", StringComparison.OrdinalIgnoreCase) ||
                            v.Label.Contains("İlgili Kişi", StringComparison.OrdinalIgnoreCase) ||
                            v.Label.Contains("Personel Ad", StringComparison.OrdinalIgnoreCase) ||
                            v.Label.Contains("Çalışan Ad", StringComparison.OrdinalIgnoreCase)
                        ))
                    );
                    item.SubjectPersonName = subjectField?.ValueText;
                }
            }
        }

        _logger.LogWarning("DIAGNOSTICS: Returning {Count} mapped list items to ActorUserId: {ActorId}.", result.Count, request.ActorUserId);
        return result;
    }
}
