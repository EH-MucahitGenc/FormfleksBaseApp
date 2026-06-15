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

/// <summary>
/// Sistemdeki en kritik iş akışı (Approval Engine) yöneticisidir.
/// Form üzerindeki onay (Approve), red (Reject) ve revizyon (ReturnForRevision) 
/// taleplerini işler. İş kurallarını (Delegasyon kontrolleri, Concurrency Token kontrolleri) işletir.
/// Sonuca göre formu bir sonraki adıma geçirir, reddeder veya revizyona gönderir ve ilgili kişilere 
/// bildirim (e-posta) gönderimini tetikler.
/// </summary>
public sealed class ExecuteApprovalActionCommandHandler : IRequestHandler<ExecuteApprovalActionCommand, ApprovalActionResponseDto>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IApprovalEngineService _engine;
    private readonly IEmailService _emailService;
    private readonly IUserRepository _userRepository;
    private readonly IPdfGeneratorService _pdfGenerator;
    private readonly IFormAttachmentCollectorService _attachmentCollector;
    private readonly FormfleksBaseApp.Application.Auth.Interfaces.ITokenService _tokens;
    private readonly IAppNotificationService _notificationService;

    public ExecuteApprovalActionCommandHandler(
        IDynamicFormsDbContext db, 
        IApprovalEngineService engine, 
        IEmailService emailService, 
        IUserRepository userRepository,
        IPdfGeneratorService pdfGenerator,
        IFormAttachmentCollectorService attachmentCollector,
        FormfleksBaseApp.Application.Auth.Interfaces.ITokenService tokens,
        IAppNotificationService notificationService)
    {
        _db = db;
        _engine = engine;
        _emailService = emailService;
        _userRepository = userRepository;
        _pdfGenerator = pdfGenerator;
        _attachmentCollector = attachmentCollector;
        _tokens = tokens;
        _notificationService = notificationService;
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
        
        bool hasBranchHrAuth = false;
        if (currentStep.AssigneeType == (short)WorkflowAssigneeType.LocationBasedRole && currentStep.TargetLocationRoleId.HasValue)
        {
            var reqPers = await _db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == req.RequestorUserId, ct);
            var reqLocation = reqPers?.Isyeri_Tanimi;

            var locationRoles = await _db.UserLocationRoles
                .AsNoTracking()
                .Where(x => x.UserId == reqDto.ActorUserId && x.RoleId == currentStep.TargetLocationRoleId.Value && x.IsActive)
                .ToListAsync(ct);

            hasBranchHrAuth = locationRoles.Any(x => x.IsGlobalManager || (reqLocation != null && x.LocationName == reqLocation));
        }

        if (!hasUserAuth && !hasRoleAuth && !hasBranchHrAuth)
            throw new BusinessException("Bu dokümanı şu anki kademede onaylama/reddetme yetkiniz bulunmuyor.");

        approval.ActionByUserId = reqDto.ActorUserId;
        approval.ActionComment = reqDto.Comment;
        approval.ActionAt = DateTime.UtcNow;

        _db.AuditLogs.Add(new AuditLogEntity
        {
            EntityType = "FormRequestApproval",
            EntityId = req.Id,
            ActionType = reqDto.ActionType == ApprovalActionType.Approve ? "Approved" :
                         reqDto.ActionType == ApprovalActionType.Reject ? "Rejected" : "ReturnedForRevision",
            ActorUserId = reqDto.ActorUserId,
            DetailJson = System.Text.Json.JsonSerializer.Serialize(new { Comment = reqDto.Comment, StepNo = req.CurrentStepNo }),
            CreatedAt = DateTime.UtcNow
        });

        Func<List<FormfleksBaseApp.Application.Common.Models.EmailAttachment>, Task>? sendNotificationTask = null;

        if (reqDto.ActionType == ApprovalActionType.Reject)
        {
            req.Reject((short)FormRequestStatus.Rejected);

            if (approval is not null)
                approval.Status = (short)ApprovalStatus.Rejected;
                
            sendNotificationTask = (atts) => NotifyRequesterFinalStatusAsync(req.RequestorUserId, req.RequestNo, req.Id, req.FormTypeId, false, atts, ct);
        }
        else if (reqDto.ActionType == ApprovalActionType.ReturnForRevision)
        {
            req.ReturnForRevision((short)FormRequestStatus.ReturnedForRevision);

            if (approval is not null)
                approval.Status = (short)ApprovalStatus.ReturnedForRevision;
                
            sendNotificationTask = (atts) => NotifyRequesterRevisionAsync(req.RequestorUserId, req.RequestNo, req.Id, req.FormTypeId, atts, ct);
        }
        else // Approve
        {
            if (approval is not null)
                approval.Status = (short)ApprovalStatus.Approved;

            // Sonraki adımı bul (Auto-skip özelliği ile hiyerarşiyi atlar)
            var (nextStep, assignedUser, assignedRole, skippedSteps) = await _engine.ResolveNextValidStepAsync(
                wfDef.Id, 
                req.CurrentStepNo ?? 0, 
                req.RequestorUserId, 
                ct);

            // Kaydedilecek Atlanan Adımlar (Skipped Steps)
            foreach (var skip in skippedSteps)
            {
                _db.FormRequestApprovals.Add(new FormRequestApprovalEntity
                {
                    Id = Guid.NewGuid(),
                    RequestId = req.Id,
                    StepNo = skip.Step.StepNo,
                    WorkflowStepId = skip.Step.Id,
                    Status = (short)ApprovalStatus.Skipped,
                    ActionComment = skip.Reason,
                    ActionAt = DateTime.UtcNow
                });
            }

            if (nextStep is null)
            {
                req.Approve((short)FormRequestStatus.Approved);
                sendNotificationTask = async (atts) => 
                {
                    await NotifyRequesterFinalStatusAsync(req.RequestorUserId, req.RequestNo, req.Id, req.FormTypeId, true, atts, ct);
                    await NotifyGlobalManagersCompletedAsync(req.Id, req.FormTypeId, req.RequestorUserId, req.RequestNo, atts, ct);
                };
            }
            else
            {
                req.CurrentStepNo = nextStep.StepNo;

                var approvalId = Guid.NewGuid();
                // Yeni adim icin approval kaydi
                _db.FormRequestApprovals.Add(new FormRequestApprovalEntity
                {
                    Id = approvalId,
                    RequestId = req.Id,
                    StepNo = nextStep.StepNo,
                    WorkflowStepId = nextStep.Id,
                    Status = (short)ApprovalStatus.Pending,
                    AssigneeRoleId = assignedRole,
                    AssigneeUserId = assignedUser
                });
                
                sendNotificationTask = (atts) => NotifyNextAssigneeAsync(approvalId, req.Id, assignedUser, assignedRole, req.RequestorUserId, req.RequestNo, req.FormTypeId, nextStep.AssigneeType, nextStep.TargetLocationRoleId, atts, ct);
            }
        }

        // 1. Önce veri tabanına işlemleri kaydediyoruz ki PDF motoru yepyeni güncel onay ve statü bilgilerini okuyabilsin.
        await _db.SaveChangesAsync(ct);

        // 2. Şimdi en güncel verilerle PDF üretiyoruz.
        var attachments = await GenerateAttachmentsSafeAsync(req.Id, ct);

        // 3. Son olarak ilgili e-posta bildirimini asenkron görev olarak işletiyoruz.
        if (sendNotificationTask != null)
        {
            await sendNotificationTask(attachments);
        }

        return new ApprovalActionResponseDto { Success = true };
    }
    
    private async Task<List<FormfleksBaseApp.Application.Common.Models.EmailAttachment>> GenerateAttachmentsSafeAsync(Guid requestId, CancellationToken ct)
    {
        var attachments = new List<FormfleksBaseApp.Application.Common.Models.EmailAttachment>();
        try 
        {
            var pdfAttachment = await _pdfGenerator.GenerateFormPdfAsync(requestId, ct);
            if (pdfAttachment != null) attachments.Add(pdfAttachment);

            var fileAttachments = await _attachmentCollector.CollectAttachmentsAsync(requestId, ct);
            if (fileAttachments != null && fileAttachments.Any()) attachments.AddRange(fileAttachments);
        }
        catch
        {
            // Sessizce hatayı yut (PDF veya dosya okunamasa bile onay akışı kesilmemeli)
        }
        return attachments;
    }

    private async Task NotifyNextAssigneeAsync(Guid approvalId, Guid requestId, Guid? assignedUserId, Guid? assignedRoleId, Guid requestorUserId, string requestNo, Guid formTypeId, short assigneeType, Guid? targetLocationRoleId, List<FormfleksBaseApp.Application.Common.Models.EmailAttachment> attachments, CancellationToken ct)
    {
        var targetList = new List<(string Email, string Name, Guid UserId)>();

        if (assigneeType == (short)WorkflowAssigneeType.LocationBasedRole && targetLocationRoleId.HasValue)
        {
            var authReqPers = await _db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == requestorUserId && p.IsActive, ct);
            var reqLocation = authReqPers?.Isyeri_Tanimi;

            var authorizedLocationUserIds = await _db.UserLocationRoles
                .AsNoTracking()
                .Where(x => x.IsActive && x.RoleId == targetLocationRoleId.Value && x.LocationName == reqLocation)
                .Select(x => x.UserId)
                .Distinct()
                .ToListAsync(ct);

            foreach (var hrUserId in authorizedLocationUserIds)
            {
                var hrPers = await _db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == hrUserId && p.IsActive, ct);
                if (hrPers != null && !string.IsNullOrWhiteSpace(hrPers.Email))
                {
                    targetList.Add((hrPers.Email, $"{hrPers.Adi} {hrPers.Soyadi}", hrUserId));
                }
                else
                {
                    var baseUser = await _userRepository.GetByIdAsync(hrUserId, ct, false);
                    if (baseUser != null && !string.IsNullOrWhiteSpace(baseUser.Email))
                        targetList.Add((baseUser.Email, baseUser.DisplayName ?? "Bilinmeyen İK Sorumlusu", hrUserId));
                }
            }
        }
        else if (assignedUserId.HasValue)
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
            if (!string.IsNullOrWhiteSpace(targetEmail)) targetList.Add((targetEmail, assgnName, assignedUserId.Value));
        }
        else if (assignedRoleId.HasValue)
        {
            var roleUserIds = await _db.UserRoles.AsNoTracking().Where(r => r.RoleId == assignedRoleId.Value).Select(r => r.UserId).ToListAsync(ct);
            var qdmsUsers = await _db.QdmsPersoneller.AsNoTracking().Where(p => p.LinkedUserId.HasValue && roleUserIds.Contains(p.LinkedUserId.Value) && p.IsActive).ToListAsync(ct);
            
            foreach (var p in qdmsUsers)
            {
                if (!string.IsNullOrWhiteSpace(p.Email)) targetList.Add((p.Email, $"{p.Adi} {p.Soyadi}", p.LinkedUserId.Value));
            }
            
            var missingEmailsUserIds = roleUserIds.Except(qdmsUsers.Where(p => !string.IsNullOrWhiteSpace(p.Email)).Select(p => p.LinkedUserId!.Value)).ToList();
            foreach (var muid in missingEmailsUserIds)
            {
                var baseUser = await _userRepository.GetByIdAsync(muid, ct, false);
                if (baseUser != null && !string.IsNullOrWhiteSpace(baseUser.Email))
                {
                    targetList.Add((baseUser.Email, string.IsNullOrWhiteSpace(baseUser.DisplayName) ? "Bilinmeyen Sistem Kullanıcısı" : baseUser.DisplayName, muid));
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
                var token = _tokens.CreateQuickActionToken(approvalId, target.UserId);
                await _emailService.SendApprovalRequestEmailAsync(target.Email, target.Name, requestNo, requestId, formType.Name, reqName, reqPers?.Isyeri_Tanimi ?? "", attachments, token, ct);
                
                // SignalR Notification
                await _notificationService.SendNotificationAsync(
                    userId: target.UserId,
                    title: "Yeni Onay Bekliyor",
                    message: $"{formType.Name} için onayınız bekleniyor. Talep No: {requestNo}",
                    actionUrl: $"/forms/{requestId}",
                    referenceId: requestId,
                    cancellationToken: ct
                );
            }
        }
    }

    private async Task NotifyRequesterFinalStatusAsync(Guid requestorUserId, string requestNo, Guid requestId, Guid formTypeId, bool isApproved, List<FormfleksBaseApp.Application.Common.Models.EmailAttachment> attachments, CancellationToken ct)
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
            await _emailService.SendApprovalCompletedEmailAsync(targetEmail, reqName, requestNo, requestId, formType.Name, isApproved, reqPers?.Isyeri_Tanimi ?? "", attachments, ct);
            
            // SignalR Notification
            string title = isApproved ? "Talebiniz Onaylandı" : "Talebiniz Reddedildi";
            string msg = isApproved ? $"{requestNo} numaralı talebiniz başarıyla onaylanmıştır." : $"{requestNo} numaralı talebiniz reddedilmiştir.";
            
            await _notificationService.SendNotificationAsync(
                userId: requestorUserId,
                title: title,
                message: msg,
                actionUrl: $"/forms/{requestId}",
                referenceId: requestId,
                cancellationToken: ct
            );
        }
    }

    private async Task NotifyRequesterRevisionAsync(Guid requestorUserId, string requestNo, Guid requestId, Guid formTypeId, List<FormfleksBaseApp.Application.Common.Models.EmailAttachment> attachments, CancellationToken ct)
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
            await _emailService.SendApprovalReturnedEmailAsync(targetEmail, reqName, requestNo, requestId, formType.Name, reqPers?.Isyeri_Tanimi ?? "", attachments, ct);
            
            // SignalR Notification
            await _notificationService.SendNotificationAsync(
                userId: requestorUserId,
                title: "Talebiniz Revizyona Gönderildi",
                message: $"{requestNo} numaralı talebiniz için revizyon (düzeltme) istenmiştir.",
                actionUrl: $"/forms/{requestId}",
                referenceId: requestId,
                cancellationToken: ct
            );
        }
    }

    private async Task NotifyGlobalManagersCompletedAsync(Guid requestId, Guid formTypeId, Guid requestorUserId, string requestNo, List<FormfleksBaseApp.Application.Common.Models.EmailAttachment> attachments, CancellationToken ct)
    {
        var wfDef = await _db.WorkflowDefinitions.AsNoTracking().FirstOrDefaultAsync(w => w.FormTypeId == formTypeId && w.IsActive, ct);
        if (wfDef == null) return;

        var locationRoleIds = await _db.WorkflowSteps
            .AsNoTracking()
            .Where(s => s.WorkflowDefinitionId == wfDef.Id && s.AssigneeType == (short)WorkflowAssigneeType.LocationBasedRole && s.TargetLocationRoleId.HasValue)
            .Select(s => s.TargetLocationRoleId!.Value)
            .Distinct()
            .ToListAsync(ct);

        if (!locationRoleIds.Any()) return;

        var globalManagerUserIds = await _db.UserLocationRoles
            .AsNoTracking()
            .Where(x => x.IsActive && x.IsGlobalManager && locationRoleIds.Contains(x.RoleId))
            .Select(x => x.UserId)
            .Distinct()
            .ToListAsync(ct);

        if (!globalManagerUserIds.Any()) return;

        var formType = await _db.FormTypes.AsNoTracking().FirstOrDefaultAsync(f => f.Id == formTypeId, ct);
        var reqPers = await _db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == requestorUserId && p.IsActive, ct);
        string reqName = reqPers != null ? $"{reqPers.Adi} {reqPers.Soyadi}" : "Bilinmeyen Sistem Kullanıcısı";
        
        if (reqPers == null || string.IsNullOrWhiteSpace(reqPers.Email))
        {
            var baseReqUser = await _userRepository.GetByIdAsync(requestorUserId, ct, false);
            if (baseReqUser != null && !string.IsNullOrWhiteSpace(baseReqUser.DisplayName))
                reqName = baseReqUser.DisplayName;
        }

        foreach (var gmId in globalManagerUserIds)
        {
            if (gmId == requestorUserId) continue; // Requester already got an email

            var gmPers = await _db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == gmId && p.IsActive, ct);
            string? targetEmail = gmPers?.Email;
            string gmName = gmPers != null ? $"{gmPers.Adi} {gmPers.Soyadi}" : "Sayın Yönetici";

            if (string.IsNullOrWhiteSpace(targetEmail))
            {
                var baseUser = await _userRepository.GetByIdAsync(gmId, ct, false);
                targetEmail = baseUser?.Email;
                if (baseUser != null && !string.IsNullOrWhiteSpace(baseUser.DisplayName))
                    gmName = baseUser.DisplayName;
            }

            if (!string.IsNullOrWhiteSpace(targetEmail) && formType != null)
            {
                await _emailService.SendGlobalManagerInfoEmailAsync(targetEmail, gmName, requestNo, requestId, formType.Name, reqName, reqPers?.Isyeri_Tanimi ?? "", attachments, ct);
            }
        }
    }
}
