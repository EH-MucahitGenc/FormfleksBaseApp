using System;
using System.Linq;
using System.Text.Json;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging;

namespace FormfleksBaseApp.Application.DynamicForms.Business.Services;

public class ApprovalEngineService : IApprovalEngineService
{
    private readonly IDynamicFormsDbContext _db;
    private readonly Microsoft.Extensions.Logging.ILogger<ApprovalEngineService> _logger;

    public ApprovalEngineService(IDynamicFormsDbContext db, Microsoft.Extensions.Logging.ILogger<ApprovalEngineService> logger)
    {
        _db = db;
        _logger = logger;
    }

    public async Task<(WorkflowStepEntity? Step, Guid? AssigneeUserId, Guid? AssigneeRoleId, List<(WorkflowStepEntity Step, string Reason)> SkippedSteps)> ResolveNextValidStepAsync(
        Guid workflowDefinitionId, 
        int currentStepNo, 
        Guid requestorUserId, 
        CancellationToken ct)
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
                return (null, null, null, skippedSteps);
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
                }
                return (nextStep, finalUserId, nextStep.AssigneeRoleId, skippedSteps);
            }

            // 2) Is it an ENTERPRISE OGRANIZATIONAL ROLE?
            if (nextStep.AssigneeType >= 10 && nextStep.AssigneeType <= 20)
            {
                if (nextStep.AssigneeType == (short)WorkflowAssigneeType.LocationBasedRole)
                {
                    // LocationBasedRole (Lokasyon Bazlı Rol) çalışma zamanında (runtime) dinamik olarak
                    // GetPendingApprovalsQuery içerisinde filtrelenir.
                    // Bu nedenle tek bir statik AssigneeUserId veya RoleId'ye bağlanmaz.
                    // Adımı olduğu gibi (null, null) olarak döndürüp, formun bu adımda beklemesini sağlıyoruz.
                    return (nextStep, null, null, skippedSteps);
                }

                var requestorPersonnel = await _db.QdmsPersoneller
                    .AsNoTracking()
                    .FirstOrDefaultAsync(p => p.LinkedUserId == requestorUserId && p.IsActive, ct);

                if (requestorPersonnel == null) 
                {
                    _logger.LogWarning("DIAGNOSTICS: Engine cannot find QdmsPersonel record for RequestorUserId: {RequestorId}. Fallbacking.", requestorUserId);
                    var fallbackRes = await HandleFallbackActionAsync(nextStep);
                    if (fallbackRes.ShouldSkip)
                    {
                        skippedSteps.Add((nextStep, "Talep sahibinin organizasyon kaydı bulunamadığı için adım otomatik atlandı."));
                        checkStepNo = nextStep.StepNo;
                        continue;
                    }
                    else
                    {
                        return (nextStep, fallbackRes.FallbackUserId, null, skippedSteps);
                    }
                }

                _logger.LogWarning("DIAGNOSTICS: Found QdmsPersonel for Requestor {RequestorId}. Pozisyon_Kodu: {Pozisyon}, Ust_Pozisyon_Kodu: {UstPozisyon}", requestorUserId, requestorPersonnel.Pozisyon_Kodu, requestorPersonnel.Ust_Pozisyon_Kodu);

                Guid? resolvedUserId = null;

                if (nextStep.AssigneeType == (short)WorkflowAssigneeType.DirectManager)
                {
                    resolvedUserId = await ResolveDirectManagerAsync(requestorPersonnel, ct);
                    _logger.LogWarning("DIAGNOSTICS: DirectManager resolved to UserId: {ResolvedId}", resolvedUserId);
                }
                else if (nextStep.AssigneeType == (short)WorkflowAssigneeType.UpperManager)
                {
                    resolvedUserId = await ResolveUpperManagerAsync(requestorPersonnel, ct);
                }

                if (resolvedUserId.HasValue && resolvedUserId.Value != requestorUserId)
                {
                    var finalDelegatedUserId = await ResolveDelegationAsync(resolvedUserId.Value, ct);
                    return (nextStep, finalDelegatedUserId, null, skippedSteps);
                }

                // If not resolved, execute fallback!
                var finalFallback = await HandleFallbackActionAsync(nextStep);
                if (finalFallback.ShouldSkip)
                {
                    skippedSteps.Add((nextStep, "Organizasyon yapısında geçerli bir yönetici/sorumlu bulunamadığı için adım otomatik atlandı."));
                    checkStepNo = nextStep.StepNo;
                    continue;
                }
                else
                {
                    return (nextStep, finalFallback.FallbackUserId, null, skippedSteps);
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

    private async Task<(bool ShouldSkip, Guid? FallbackUserId)> HandleFallbackActionAsync(WorkflowStepEntity failedStep)
    {
        if (failedStep.FallbackAction == (short)WorkflowFallbackAction.Skip)
        {
            return (true, null);
        }
        else if (failedStep.FallbackAction == (short)WorkflowFallbackAction.FallToFixedUser && failedStep.FallbackUserId.HasValue)
        {
            var finalFallbackId = await ResolveDelegationAsync(failedStep.FallbackUserId.Value, CancellationToken.None);
            return (false, finalFallbackId);
        }
        
        // Default Skip
        return (true, null);
    }

    private async Task<Guid?> ResolveDirectManagerAsync(FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelAktarim requestor, CancellationToken ct)
    {
        if (string.IsNullOrWhiteSpace(requestor.Ust_Pozisyon_Kodu) || requestor.Pozisyon_Kodu == requestor.Ust_Pozisyon_Kodu)
        {
            _logger.LogWarning("DIAGNOSTICS: DirectManager search failed. Ust_Pozisyon_Kodu is empty or matches requestor's own code.");
            return null;
        }

        var manager = await _db.QdmsPersoneller
            .AsNoTracking()
            .FirstOrDefaultAsync(p => p.Pozisyon_Kodu == requestor.Ust_Pozisyon_Kodu && p.IsActive, ct);

        if (manager == null) 
        {
            _logger.LogWarning("DIAGNOSTICS: DirectManager search failed. No active QdmsPersonel with Pozisyon_Kodu {UstPozisyon} found.", requestor.Ust_Pozisyon_Kodu);
        }
        else 
        {
            _logger.LogWarning("DIAGNOSTICS: DirectManager found! Qdms Adi: {Adi} {Soyadi}, LinkedUserId: {LinkedUser}", manager.Adi, manager.Soyadi, manager.LinkedUserId);
        }

        return manager?.LinkedUserId;
    }

    private async Task<Guid?> ResolveUpperManagerAsync(FormfleksBaseApp.Domain.Entities.Admin.QdmsPersonelAktarim requestor, CancellationToken ct)
    {
        // 2 Kademe tırmanış (UpperManager)
        var m1Id = await ResolveDirectManagerAsync(requestor, ct);
        if (m1Id == null) return null;

        var manager1 = await _db.QdmsPersoneller.FirstOrDefaultAsync(p => p.LinkedUserId == m1Id && p.IsActive, ct);
        if (manager1 == null) return null;

        return await ResolveDirectManagerAsync(manager1, ct);
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
