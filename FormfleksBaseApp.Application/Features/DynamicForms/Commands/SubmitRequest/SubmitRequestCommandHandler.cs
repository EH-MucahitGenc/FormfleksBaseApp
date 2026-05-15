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

using Microsoft.Extensions.Logging;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.SubmitRequest;

public sealed class SubmitRequestCommandHandler : IRequestHandler<SubmitRequestCommand, FormRequestResultDto>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IApprovalEngineService _engine;
    private readonly IEmailService _emailService;
    private readonly IUserRepository _userRepository;
    private readonly ILogger<SubmitRequestCommandHandler> _logger;
    private readonly IPdfGeneratorService _pdfGenerator;
    private readonly IFormAttachmentCollectorService _attachmentCollector;

    public SubmitRequestCommandHandler(
        IDynamicFormsDbContext db, 
        IApprovalEngineService engine, 
        IEmailService emailService, 
        IUserRepository userRepository, 
        ILogger<SubmitRequestCommandHandler> logger,
        IPdfGeneratorService pdfGenerator,
        IFormAttachmentCollectorService attachmentCollector)
    {
        _db = db;
        _engine = engine;
        _emailService = emailService;
        _userRepository = userRepository;
        _logger = logger;
        _pdfGenerator = pdfGenerator;
        _attachmentCollector = attachmentCollector;
    }

    public async Task<FormRequestResultDto> Handle(SubmitRequestCommand request, CancellationToken ct)
    {
        var dto = request.Request;
        var req = await _db.FormRequests
            .FirstOrDefaultAsync(r => r.Id == dto.RequestId, ct)
            ?? throw new BusinessException("Kayıt bulunamadı.");

        if (req.Status != (short)FormRequestStatus.Draft && req.Status != (short)FormRequestStatus.ReturnedForRevision)
            throw new BusinessException("Sadece taslak (Draft) veya iade edilmiş (ReturnedForRevision) durumundaki formlar onaya gönderilebilir.");

        // Aktif workflow bul
        var wfDef = await _db.WorkflowDefinitions
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.FormTypeId == req.FormTypeId && w.IsActive, ct);

        if (wfDef is null)
        {
            // Onay rotası yoksa direkt ONAYLANDI yap
            req.Approve((short)FormRequestStatus.Approved);
        }
        else
        {
            var (firstStep, assignedUser, assignedRole) = await _engine.ResolveNextValidStepAsync(wfDef.Id, 0, req.RequestorUserId, ct);

            if (firstStep is null)
            {
                req.Approve((short)FormRequestStatus.Approved);
            }
            else
            {
                req.Submit((short)FormRequestStatus.InApproval);
                req.CurrentStepNo = firstStep.StepNo;

                _db.FormRequestApprovals.Add(new FormRequestApprovalEntity
                {
                    RequestId = req.Id,
                    StepNo = firstStep.StepNo,
                    WorkflowStepId = firstStep.Id,
                    Status = (short)ApprovalStatus.Pending,
                    AssigneeRoleId = assignedRole,
                    AssigneeUserId = assignedUser
                });
                _db.AuditLogs.Add(new AuditLogEntity
                {
                    EntityType = "FormRequest",
                    EntityId = req.Id,
                    ActionType = "FormSubmitted",
                    ActorUserId = req.RequestorUserId,
                    DetailJson = $"{{\"Status\": \"{req.Status}\", \"StepNo\": {req.CurrentStepNo}}}",
                    CreatedAt = DateTime.UtcNow
                });

                await _db.SaveChangesAsync(ct);

                // Email Bildirimi (Background Queue'ya atılır)
                await NotifyNextAssigneeAsync(req.Id, assignedUser, assignedRole, req.RequestorUserId, req.RequestNo, req.FormTypeId, firstStep.AssigneeType, firstStep.TargetLocationRoleId, ct);

                return new FormRequestResultDto
                {
                    RequestId = req.Id,
                    Status = (FormRequestStatus)req.Status,
                    CurrentStepNo = req.CurrentStepNo,
                    ConcurrencyToken = req.ConcurrencyToken
                };
            }
        }

        _db.AuditLogs.Add(new AuditLogEntity
        {
            EntityType = "FormRequest",
            EntityId = req.Id,
            ActionType = "FormSubmitted",
            ActorUserId = req.RequestorUserId,
            DetailJson = $"{{\"Status\": \"{req.Status}\", \"StepNo\": {req.CurrentStepNo}}}",
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(ct);

        return new FormRequestResultDto
        {
            RequestId = req.Id,
            Status = (FormRequestStatus)req.Status,
            CurrentStepNo = req.CurrentStepNo,
            ConcurrencyToken = req.ConcurrencyToken
        };
    }

    private async Task NotifyNextAssigneeAsync(Guid requestId, Guid? assignedUserId, Guid? assignedRoleId, Guid requestorUserId, string requestNo, Guid formTypeId, short assigneeType, Guid? targetLocationRoleId, CancellationToken ct)
    {
        var targetList = new List<(string Email, string Name)>();

        if (assigneeType == (short)WorkflowAssigneeType.LocationBasedRole && targetLocationRoleId.HasValue)
        {
            var authReqPers = await _db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == requestorUserId && p.IsActive, ct);
            var reqLocation = authReqPers?.Isyeri_Tanimi;

            var authorizedLocationUserIds = await _db.UserLocationRoles
                .AsNoTracking()
                .Where(x => x.IsActive && x.RoleId == targetLocationRoleId.Value && (x.IsGlobalManager || x.LocationName == reqLocation))
                .Select(x => x.UserId)
                .Distinct()
                .ToListAsync(ct);

            foreach (var hrUserId in authorizedLocationUserIds)
            {
                var hrPers = await _db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == hrUserId && p.IsActive, ct);
                if (hrPers != null && !string.IsNullOrWhiteSpace(hrPers.Email))
                {
                    targetList.Add((hrPers.Email, $"{hrPers.Adi} {hrPers.Soyadi}"));
                }
                else
                {
                    var baseUser = await _userRepository.GetByIdAsync(hrUserId, ct, false);
                    if (baseUser != null && !string.IsNullOrWhiteSpace(baseUser.Email))
                        targetList.Add((baseUser.Email, baseUser.DisplayName ?? "Bilinmeyen İK Sorumlusu"));
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

        if (!targetList.Any()) 
        {
            _logger.LogWarning("SubmitRequest: No valid email targets found for assigning step to User: {UserId} or Role: {RoleId}", assignedUserId, assignedRoleId);
            return;
        }

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
            var attachments = new List<FormfleksBaseApp.Application.Common.Models.EmailAttachment>();

            try 
            {
                var pdfAttachment = await _pdfGenerator.GenerateFormPdfAsync(requestId, ct);
                if (pdfAttachment != null) attachments.Add(pdfAttachment);

                var fileAttachments = await _attachmentCollector.CollectAttachmentsAsync(requestId, ct);
                if (fileAttachments != null && fileAttachments.Any()) attachments.AddRange(fileAttachments);
            }
            catch (Exception ex)
            {
                _logger.LogError(ex, "Failed to generate attachments for RequestId: {RequestId}", requestId);
            }

            foreach (var target in targetList.DistinctBy(x => x.Email))
            {
                _logger.LogInformation("SubmitRequest: Queuing email notification for {Email} ({Name})", target.Email, target.Name);
                await _emailService.SendApprovalRequestEmailAsync(target.Email, target.Name, requestNo, requestId, formType.Name, reqName, reqPers?.Isyeri_Tanimi ?? "", attachments, ct);
            }
        }
    }
}
