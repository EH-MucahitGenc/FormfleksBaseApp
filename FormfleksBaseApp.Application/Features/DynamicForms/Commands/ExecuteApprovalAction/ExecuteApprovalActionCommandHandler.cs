using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

using FormfleksBaseApp.Application.Auth.Interfaces;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.ExecuteApprovalAction;

public sealed class ExecuteApprovalActionCommandHandler : IRequestHandler<ExecuteApprovalActionCommand, ApprovalActionResponseDto>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IApprovalEngineService _engine;
    private readonly IEmailService _emailService;
    private readonly IUserRepository _userRepository;

    public ExecuteApprovalActionCommandHandler(IDynamicFormsDbContext db, IApprovalEngineService engine, IEmailService emailService, IUserRepository userRepository)
    {
        _db = db;
        _engine = engine;
        _emailService = emailService;
        _userRepository = userRepository;
    }

    public async Task<ApprovalActionResponseDto> Handle(ExecuteApprovalActionCommand request, CancellationToken ct)
    {
        var reqDto = request.Request;
        var req = await _db.FormRequests
            .FirstOrDefaultAsync(r => r.Id == reqDto.RequestId, ct)
            ?? throw new BusinessException("Kayıt bulunamadı.");

        if (req.Status != (short)FormRequestStatus.InApproval)
            throw new BusinessException("Bu kayıt şu an onay bekleyen statüde değil.");

        // Workflow tanımını bul
        var wfDef = await _db.WorkflowDefinitions
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.FormTypeId == req.FormTypeId && w.IsActive, ct)
            ?? throw new BusinessException("Onay rotası bulunamadı.");

        var currentStep = await _db.WorkflowSteps
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.WorkflowDefinitionId == wfDef.Id && s.StepNo == req.CurrentStepNo, ct)
            ?? throw new BusinessException("Geçersiz onay adımı durumu.");

        // Kademeye ait aktif Onay kaydını al
        var approval = await _db.FormRequestApprovals
            .FirstOrDefaultAsync(a => a.RequestId == req.Id && a.StepNo == req.CurrentStepNo && a.Status == (short)ApprovalStatus.Pending, ct)
            ?? throw new BusinessException("Bu adım için aktif bir onay talebi bulunamadı.");

        // Yetki kontrolü (Onay kaydı üzerinden yapılır, şablon üzerinden değil)
        var userRoleIds = await _db.UserRoles
            .AsNoTracking()
            .Where(ur => ur.UserId == reqDto.ActorUserId)
            .Select(ur => ur.RoleId)
            .ToListAsync(ct);

        bool hasUserAuth = approval.AssigneeUserId == reqDto.ActorUserId;
        bool hasRoleAuth = approval.AssigneeRoleId.HasValue && userRoleIds.Contains(approval.AssigneeRoleId.Value);

        if (!hasUserAuth && !hasRoleAuth)
            throw new BusinessException("Bu dokümanı şu anki kademede onaylama/reddetme yetkiniz bulunmuyor.");

        approval.ActionByUserId = reqDto.ActorUserId;
        approval.ActionComment = reqDto.Comment;
        approval.ActionAt = DateTime.UtcNow;

        if (reqDto.ActionType == ApprovalActionType.Reject)
        {
            req.Reject((short)FormRequestStatus.Rejected);

            if (approval is not null)
                approval.Status = (short)ApprovalStatus.Rejected;
                
            await NotifyRequesterFinalStatusAsync(req.RequestorUserId, req.RequestNo, req.Id, req.FormTypeId, false, ct);
        }
        else if (reqDto.ActionType == ApprovalActionType.ReturnForRevision)
        {
            req.ReturnForRevision((short)FormRequestStatus.ReturnedForRevision);

            if (approval is not null)
                approval.Status = (short)ApprovalStatus.ReturnedForRevision;
        }
        else // Approve
        {
            if (approval is not null)
                approval.Status = (short)ApprovalStatus.Approved;

            // Sonraki adımı bul (Auto-skip özelliği ile hiyerarşiyi atlar)
            var (nextStep, assignedUser, assignedRole) = await _engine.ResolveNextValidStepAsync(
                wfDef.Id, 
                req.CurrentStepNo ?? 0, 
                req.RequestorUserId, 
                ct);

            if (nextStep is null)
            {
                req.Approve((short)FormRequestStatus.Approved);
                await NotifyRequesterFinalStatusAsync(req.RequestorUserId, req.RequestNo, req.Id, req.FormTypeId, true, ct);
            }
            else
            {
                req.CurrentStepNo = nextStep.StepNo;

                // Yeni adim icin approval kaydi
                _db.FormRequestApprovals.Add(new FormRequestApprovalEntity
                {
                    RequestId = req.Id,
                    StepNo = nextStep.StepNo,
                    WorkflowStepId = nextStep.Id,
                    Status = (short)ApprovalStatus.Pending,
                    AssigneeRoleId = assignedRole,
                    AssigneeUserId = assignedUser
                });
                
                await NotifyNextAssigneeAsync(req.Id, assignedUser, assignedRole, req.RequestorUserId, req.RequestNo, req.FormTypeId, ct);
            }
        }

        _db.AuditLogs.Add(new AuditLogEntity
        {
            EntityType = "FormRequestApproval",
            EntityId = req.Id,
            ActionType = reqDto.ActionType == ApprovalActionType.Approve ? "Approved" :
                         reqDto.ActionType == ApprovalActionType.Reject ? "Rejected" : "ReturnedForRevision",
            ActorUserId = reqDto.ActorUserId,
            DetailJson = $"{{\"Comment\": \"{reqDto.Comment}\", \"StepNo\": {req.CurrentStepNo}}}",
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(ct);

        return new ApprovalActionResponseDto { Success = true };
    }
    
    private async Task NotifyNextAssigneeAsync(Guid requestId, Guid? assignedUserId, Guid? assignedRoleId, Guid requestorUserId, string requestNo, Guid formTypeId, CancellationToken ct)
    {
        var targetList = new List<(string Email, string Name)>();

        if (assignedUserId.HasValue)
        {
            var assgnPers = await _db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == assignedUserId.Value && p.IsActive, ct);
            string? targetEmail = assgnPers?.Email;
            string assgnName = assgnPers != null ? $"{assgnPers.Adi} {assgnPers.Soyadi}" : "Bilinmeyen Sistem Kullanıcısı";

            if (string.IsNullOrWhiteSpace(targetEmail))
            {
                var baseUser = await _userRepository.GetByIdAsync(assignedUserId.Value, ct, false);
                targetEmail = baseUser?.Email;
                if (baseUser != null && !string.IsNullOrWhiteSpace(baseUser.DisplayName))
                    assgnName = baseUser.DisplayName;
            }
            if (!string.IsNullOrWhiteSpace(targetEmail)) targetList.Add((targetEmail, assgnName));
        }
        else if (assignedRoleId.HasValue)
        {
            var roleUserIds = await _db.UserRoles.AsNoTracking().Where(r => r.RoleId == assignedRoleId.Value).Select(r => r.UserId).ToListAsync(ct);
            var qdmsUsers = await _db.QdmsPersoneller.AsNoTracking().Where(p => p.LinkedUserId.HasValue && roleUserIds.Contains(p.LinkedUserId.Value) && p.IsActive).ToListAsync(ct);
            
            foreach (var p in qdmsUsers)
            {
                if (!string.IsNullOrWhiteSpace(p.Email)) targetList.Add((p.Email, $"{p.Adi} {p.Soyadi}"));
            }
            
            var missingEmailsUserIds = roleUserIds.Except(qdmsUsers.Where(p => !string.IsNullOrWhiteSpace(p.Email)).Select(p => p.LinkedUserId!.Value)).ToList();
            foreach (var muid in missingEmailsUserIds)
            {
                var baseUser = await _userRepository.GetByIdAsync(muid, ct, false);
                if (baseUser != null && !string.IsNullOrWhiteSpace(baseUser.Email))
                {
                    targetList.Add((baseUser.Email, string.IsNullOrWhiteSpace(baseUser.DisplayName) ? "Bilinmeyen Sistem Kullanıcısı" : baseUser.DisplayName));
                }
            }
        }

        if (!targetList.Any()) return;

        var formType = await _db.FormTypes.AsNoTracking().FirstOrDefaultAsync(f => f.Id == formTypeId, ct);
        var reqPers = await _db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == requestorUserId && p.IsActive, ct);

        string? reqEmail = reqPers?.Email;
        string reqName = reqPers != null ? $"{reqPers.Adi} {reqPers.Soyadi}" : "Bilinmeyen Sistem Kullanıcısı";

        if (string.IsNullOrWhiteSpace(reqEmail))
        {
            var baseReqUser = await _userRepository.GetByIdAsync(requestorUserId, ct, false);
            if (baseReqUser != null && !string.IsNullOrWhiteSpace(baseReqUser.DisplayName))
                reqName = baseReqUser.DisplayName;
        }

        if (formType != null)
        {
            foreach (var target in targetList.DistinctBy(x => x.Email))
            {
                await _emailService.SendApprovalRequestEmailAsync(target.Email, target.Name, requestNo, requestId, formType.Name, reqName, ct);
            }
        }
    }

    private async Task NotifyRequesterFinalStatusAsync(Guid requestorUserId, string requestNo, Guid requestId, Guid formTypeId, bool isApproved, CancellationToken ct)
    {
        var formType = await _db.FormTypes.AsNoTracking().FirstOrDefaultAsync(f => f.Id == formTypeId, ct);
        var reqPers = await _db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == requestorUserId && p.IsActive, ct);

        string? targetEmail = reqPers?.Email;
        string reqName = reqPers != null ? $"{reqPers.Adi} {reqPers.Soyadi}" : "Bilinmeyen Sistem Kullanıcısı";

        if (string.IsNullOrWhiteSpace(targetEmail))
        {
            var baseReqUser = await _userRepository.GetByIdAsync(requestorUserId, ct, false);
            targetEmail = baseReqUser?.Email;
            if (baseReqUser != null && !string.IsNullOrWhiteSpace(baseReqUser.DisplayName))
                reqName = baseReqUser.DisplayName;
        }

        if (!string.IsNullOrWhiteSpace(targetEmail) && formType != null)
        {
            await _emailService.SendApprovalCompletedEmailAsync(targetEmail, reqName, requestNo, requestId, formType.Name, isApproved, ct);
        }
    }
}
