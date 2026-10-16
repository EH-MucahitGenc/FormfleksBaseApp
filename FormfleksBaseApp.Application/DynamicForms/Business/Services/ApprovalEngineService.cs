using System;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common.Exceptions;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FormfleksBaseApp.Application.DynamicForms.Business.Services;

public class ApprovalEngineService : IApprovalEngineService
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IOrganizationAssigneeResolver _organizationResolver;
    private readonly Microsoft.Extensions.Logging.ILogger<ApprovalEngineService> _logger;

    public ApprovalEngineService(
        IDynamicFormsDbContext db,
        IOrganizationAssigneeResolver organizationResolver,
        Microsoft.Extensions.Logging.ILogger<ApprovalEngineService> logger)
    {
        _db = db;
        _organizationResolver = organizationResolver;
        _logger = logger;
    }

    public async Task<(WorkflowStepEntity? Step, Guid? AssigneeUserId, Guid? AssigneeRoleId, List<Guid> CandidateUserIds, List<(WorkflowStepEntity Step, string Reason)> SkippedSteps)> ResolveNextValidStepAsync(
        Guid workflowDefinitionId, 
        int currentStepNo, 
        Guid requestorUserId, 
        Guid formRequestId,
        List<FormfleksBaseApp.DynamicForms.Business.Contracts.ManualWorkflowAssignmentDto>? manualAssignments = null,
        CancellationToken ct = default)
    {
        var skippedSteps = new List<(WorkflowStepEntity Step, string Reason)>();
        int checkStepNo = currentStepNo;

        while (true)
        {
            // Find the immediate next step linearly
            var nextStep = await _db.WorkflowSteps
                .AsNoTracking()
                .Where(s => s.WorkflowDefinitionId == workflowDefinitionId && s.StepNo > checkStepNo)
                .OrderBy(s => s.StepNo)
                .FirstOrDefaultAsync(ct);

            if (nextStep == null)
            {
                // No more steps -> Fully Approved
                return (null, null, null, [], skippedSteps);
            }

            // 0) CHECK FOR MANUAL ASSIGNMENTS FIRST
            bool hasManualAssignment = false;
            Guid? manualUserId = null;

            if (manualAssignments != null)
            {
                var ma = manualAssignments.FirstOrDefault(m => m.StepNo == nextStep.StepNo);
                if (ma != null)
                {
                    hasManualAssignment = true;
                    manualUserId = ma.AssigneeUserId;
                }
            }
            else if (formRequestId != Guid.Empty)
            {
                var dbMa = await _db.FormRequestManualAssignments
                    .AsNoTracking()
                    .FirstOrDefaultAsync(m => m.FormRequestId == formRequestId && m.StepNo == nextStep.StepNo, ct);
                
                if (dbMa != null)
                {
                    hasManualAssignment = true;
                    manualUserId = dbMa.AssigneeUserId;
                }
            }

            if (hasManualAssignment)
            {
                if (manualUserId.HasValue)
                {
                    // User manually selected someone
                    var finalUserId = await ResolveDelegationAsync(manualUserId.Value, ct);
                    if (!await _organizationResolver.IsEligibleAssigneeAsync(finalUserId, ct))
                        throw new WorkflowManualAssignmentRequiredException(nextStep.StepNo, nextStep.Name, "Gri yaka personel onaycı olarak atanamaz.");
                    return (nextStep, finalUserId, null, [], skippedSteps);
                }
                else
                {
                    // User explicitly chose to skip this step
                    skippedSteps.Add((nextStep, "Kullanıcı tarafından manuel olarak atlanması seçildi."));
                    checkStepNo = nextStep.StepNo;
                    continue;
                }
            }

            // 1) Is it a FIXED assignment?
            if (nextStep.AssigneeType == (short)WorkflowAssigneeType.User || 
                nextStep.AssigneeType == (short)WorkflowAssigneeType.RoleGroup)
            {
                // Skip if assigned strictly to the Requestor themselves
                if (nextStep.AssigneeType == (short)WorkflowAssigneeType.User && nextStep.AssigneeUserId == requestorUserId)
                {
                    checkStepNo = nextStep.StepNo;
                    continue; 
                }
                Guid? finalUserId = nextStep.AssigneeUserId;
                if (finalUserId.HasValue)
                {
                    finalUserId = await ResolveDelegationAsync(finalUserId.Value, ct);
                    if (!await _organizationResolver.IsEligibleAssigneeAsync(finalUserId.Value, ct))
                    {
                        var fallback = await HandleFallbackActionAsync(nextStep, ct);
                        if (fallback.ShouldSkip)
                            throw new WorkflowManualAssignmentRequiredException(nextStep.StepNo, nextStep.Name, "Gri yaka personel onaycı olarak atanamaz.");

                        return (nextStep, fallback.FallbackUserId, fallback.FallbackRoleId, [], skippedSteps);
                    }
                }
                return (nextStep, finalUserId, nextStep.AssigneeRoleId, [], skippedSteps);
            }

            // 2) Is it an ENTERPRISE OGRANIZATIONAL ROLE?
            if (nextStep.AssigneeType >= 10 && nextStep.AssigneeType <= 20)
            {
                if (nextStep.AssigneeType == (short)WorkflowAssigneeType.LocationBasedRole || nextStep.AssigneeType == (short)WorkflowAssigneeType.GlobalRole)
                {
                    // LocationBasedRole (Lokasyon Bazlı Rol) çalışma zamanında (runtime) dinamik olarak
                    // GetPendingApprovalsQuery içerisinde filtrelenir.
                    // Bu nedenle tek bir statik AssigneeUserId veya RoleId'ye bağlanmaz.
                    // Adımı olduğu gibi (null, null) olarak döndürüp, formun bu adımda beklemesini sağlıyoruz.
                    return (nextStep, null, null, [], skippedSteps);
                }

                var requestorPersonnel = await _db.QdmsPersoneller
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.LinkedUserId == requestorUserId && p.IsActive, ct);

                if (requestorPersonnel == null) 
                {
                    _logger.LogWarning("DIAGNOSTICS: Engine cannot find QdmsPersonel record for RequestorUserId: {RequestorId}. Fallbacking.", requestorUserId);
                    var fallbackRes = await HandleFallbackActionAsync(nextStep, ct);
                    if (fallbackRes.ShouldSkip)
                    {
                        throw new WorkflowManualAssignmentRequiredException(nextStep.StepNo, nextStep.Name, "Talep sahibinin organizasyon kaydı (QDMS Personel) bulunamadı.");
                    }
                    else
                    {
                        return (nextStep, fallbackRes.FallbackUserId, fallbackRes.FallbackRoleId, [], skippedSteps);
                    }
                }

                _logger.LogWarning("DIAGNOSTICS: Found QdmsPersonel for Requestor {RequestorId}. Pozisyon_Kodu: {Pozisyon}, Ust_Pozisyon_Kodu: {UstPozisyon}", requestorUserId, requestorPersonnel.Pozisyon_Kodu, requestorPersonnel.Ust_Pozisyon_Kodu);

                List<Guid> resolvedUserIds = [];

                if (nextStep.AssigneeType == (short)WorkflowAssigneeType.DirectManager)
                {
                    resolvedUserIds = await ResolveManagerLevelAsync(requestorPersonnel, requestorUserId, 1, ct);
                    _logger.LogInformation("DirectManager resolved to {CandidateCount} candidate(s).", resolvedUserIds.Count);
                }
                else if (nextStep.AssigneeType == (short)WorkflowAssigneeType.UpperManager)
                {
                    resolvedUserIds = await ResolveManagerLevelAsync(requestorPersonnel, requestorUserId, 2, ct);
                }

                if (resolvedUserIds.Count > 0)
                {
                    var backwardsCompatibleAssignee = resolvedUserIds.Count == 1 ? resolvedUserIds[0] : (Guid?)null;
                    return (nextStep, backwardsCompatibleAssignee, null, resolvedUserIds, skippedSteps);
                }

                // If not resolved, execute fallback!
                var finalFallback = await HandleFallbackActionAsync(nextStep, ct);
                if (finalFallback.ShouldSkip)
                {
                    throw new WorkflowManualAssignmentRequiredException(nextStep.StepNo, nextStep.Name, "Organizasyon yapısında geçerli bir yönetici/sorumlu bulunamadı.");
                }
                else
                {
                    return (nextStep, finalFallback.FallbackUserId, finalFallback.FallbackRoleId, [], skippedSteps);
                }
            }

            // 3) Is it a Legacy JSON Rule? 
            if (nextStep.AssigneeType == (short)WorkflowAssigneeType.DynamicRule)
            {
                 // Handle legacy exactly same or fallback
                 checkStepNo = nextStep.StepNo;
                 continue;
            }
            
            // Unrecognized type -> Skip
            checkStepNo = nextStep.StepNo;
        }
    }

    private async Task<(bool ShouldSkip, Guid? FallbackUserId, Guid? FallbackRoleId)> HandleFallbackActionAsync(
        WorkflowStepEntity failedStep,
        CancellationToken ct)
    {
        if (failedStep.FallbackAction == (short)WorkflowFallbackAction.Skip)
        {
            return (true, null, null);
        }
        else if (failedStep.FallbackAction == (short)WorkflowFallbackAction.FallToFixedUser && failedStep.FallbackUserId.HasValue)
        {
            var finalFallbackId = await ResolveDelegationAsync(failedStep.FallbackUserId.Value, ct);
            if (!await _organizationResolver.IsEligibleAssigneeAsync(finalFallbackId, ct))
                return (true, null, null);
            return (false, finalFallbackId, null);
        }
        else if (failedStep.FallbackAction == (short)WorkflowFallbackAction.FallToRoleGroup && failedStep.FallbackUserId.HasValue)
        {
            // Note: FallbackUserId actually holds the RoleId if FallbackAction is FallToRoleGroup
            return (false, null, failedStep.FallbackUserId.Value);
        }
        
        // Default Skip
        return (true, null, null);
    }

    private async Task<List<Guid>> ResolveManagerLevelAsync(
        FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelAktarim requestor,
        Guid requestorUserId,
        int eligibleManagerLevel,
        CancellationToken ct)
    {
        var resolution = await _organizationResolver.ResolveManagerLevelAsync(requestor, eligibleManagerLevel, ct);
        if (!resolution.IsSuccess)
            return [];

        var linkedUserIds = resolution.Candidates
            .Where(x => x.UserId.HasValue)
            .Select(x => x.UserId!.Value);

        return await ResolveDelegatedCandidatesAsync(linkedUserIds, requestorUserId, ct);
    }

    private async Task<List<Guid>> ResolveDelegatedCandidatesAsync(IEnumerable<Guid> userIds, Guid requestorUserId, CancellationToken ct)
    {
        var candidates = new HashSet<Guid>();
        foreach (var userId in userIds.Where(x => x != requestorUserId))
        {
            var effectiveUserId = await ResolveDelegationAsync(userId, ct);
            if (effectiveUserId != requestorUserId &&
                await _organizationResolver.IsEligibleAssigneeAsync(effectiveUserId, ct))
                candidates.Add(effectiveUserId);
        }

        return candidates.ToList();
    }

    private string? ParseDynamicRule(string? json)
    {
        if (string.IsNullOrWhiteSpace(json)) return null;

        try
        {
            var doc = JsonDocument.Parse(json);
            if (doc.RootElement.TryGetProperty("RuleType", out var val))
            {
                return val.GetString();
            }
        }
        catch
        {
            // ignored
        }
        
        return null;
    }

    private async Task<Guid> ResolveDelegationAsync(Guid targetUserId, CancellationToken ct)
    {
        var now = DateTime.UtcNow;
        var activeDelegation = await _db.UserDelegations
            .AsNoTracking()
            .FirstOrDefaultAsync(d => 
                d.DelegatorUserId == targetUserId && 
                d.IsActive && 
                d.StartDate <= now && 
                d.EndDate >= now, 
                ct);

        if (activeDelegation != null)
        {
            return activeDelegation.DelegateeUserId;
        }

        return targetUserId;
    }
}
