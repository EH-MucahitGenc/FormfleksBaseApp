using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.CancelRequest;

public sealed class CancelRequestCommandHandler : IRequestHandler<CancelRequestCommand, bool>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IEmailService _emailService;
    private readonly FormfleksBaseApp.Application.Auth.Interfaces.IUserRepository _userRepository;

    public CancelRequestCommandHandler(
        IDynamicFormsDbContext db, 
        IEmailService emailService,
        FormfleksBaseApp.Application.Auth.Interfaces.IUserRepository userRepository)
    {
        _db = db;
        _emailService = emailService;
        _userRepository = userRepository;
    }

    public async Task<bool> Handle(CancelRequestCommand request, CancellationToken cancellationToken)
    {
        var formReq = await _db.FormRequests
            .FirstOrDefaultAsync(r => r.Id == request.RequestId, cancellationToken)
            ?? throw new BusinessException("Kayıt bulunamadı.");

        // Sadece formu oluşturan kişi iptal edebilir. (Admin istisnası eklenebilir ancak standart süreçte böyledir).
        if (formReq.RequestorUserId != request.ActorUserId)
            throw new BusinessException("Sadece formu oluşturan kişi iptal işlemini gerçekleştirebilir.");

        // Form sadece Submitted (Gönderildi) veya InApproval (Onay Bekliyor) statülerinde iptal edilebilir.
        if (formReq.Status != (short)FormRequestStatus.Submitted && formReq.Status != (short)FormRequestStatus.InApproval)
            throw new BusinessException("Sadece onay bekleyen formlar iptal edilebilir. Bu formun statüsü iptal işlemi için uygun değil.");

        // Formu iptal edildi olarak işaretle
        formReq.Status = (short)FormRequestStatus.Cancelled;
        formReq.CompletedAt = DateTime.UtcNow;

        // Varsa, şu an bekleyen tüm onay adımlarını da iptal et
        var pendingApprovals = await _db.FormRequestApprovals
            .Where(a => a.RequestId == request.RequestId && a.Status == (short)ApprovalStatus.Pending)
            .ToListAsync(cancellationToken);

        foreach (var approval in pendingApprovals)
        {
            approval.Status = (short)ApprovalStatus.Cancelled;
            approval.ActionAt = DateTime.UtcNow;
            approval.ActionComment = "Form sahibi tarafından iptal edildi.";
            
            if (!string.IsNullOrWhiteSpace(request.Reason))
            {
                approval.ActionComment += $" Gerekçe: {request.Reason}";
            }
        }

        // Audit Log ekleyelim
        var detailObject = new { Reason = request.Reason ?? "Form sahibi tarafından iptal edildi." };
        _db.AuditLogs.Add(new AuditLogEntity
        {
            Id = Guid.NewGuid(),
            EntityType = "FormRequest",
            EntityId = request.RequestId,
            ActorUserId = request.ActorUserId,
            ActionType = "Cancel",
            CreatedAt = DateTime.UtcNow,
            DetailJson = System.Text.Json.JsonSerializer.Serialize(detailObject)
        });

        await _db.SaveChangesAsync(cancellationToken);

        // Fetch form type and requester info to send a proper formatted email
        var formType = await _db.FormTypes.FirstOrDefaultAsync(f => f.Id == formReq.FormTypeId, cancellationToken);
        string formTypeName = formType?.Name ?? formReq.FormTypeId.ToString();
        
        var requesterUser = await _userRepository.GetByIdAsync(formReq.RequestorUserId, cancellationToken, false);
        string requesterName = requesterUser?.DisplayName ?? formReq.RequestorUserId.ToString();

        var targetList = new System.Collections.Generic.HashSet<(string Email, string Name)>();

        foreach (var approval in pendingApprovals)
        {
            if (approval.AssigneeUserId.HasValue)
            {
                var assgnPers = await _db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == approval.AssigneeUserId.Value && p.IsActive, cancellationToken);
                string? email = assgnPers?.Email;
                string name = assgnPers != null ? $"{assgnPers.Adi} {assgnPers.Soyadi}" : "";
                
                if (string.IsNullOrWhiteSpace(email))
                {
                    var baseUser = await _userRepository.GetByIdAsync(approval.AssigneeUserId.Value, cancellationToken, false);
                    email = baseUser?.Email;
                    name = baseUser?.DisplayName ?? name;
                }
                
                if (!string.IsNullOrWhiteSpace(email))
                    targetList.Add((email, string.IsNullOrWhiteSpace(name) ? email : name));
            }
            else if (approval.AssigneeRoleId.HasValue)
            {
                var roleUserIds = await _db.UserRoles.AsNoTracking().Where(r => r.RoleId == approval.AssigneeRoleId.Value).Select(r => r.UserId).ToListAsync(cancellationToken);
                var qdmsUsers = await _db.QdmsPersoneller.AsNoTracking().Where(p => p.LinkedUserId.HasValue && roleUserIds.Contains(p.LinkedUserId.Value) && p.IsActive).ToListAsync(cancellationToken);
                
                foreach (var p in qdmsUsers)
                {
                    if (!string.IsNullOrWhiteSpace(p.Email)) targetList.Add((p.Email, $"{p.Adi} {p.Soyadi}"));
                }
                
                var missingEmailsUserIds = roleUserIds.Except(qdmsUsers.Where(p => !string.IsNullOrWhiteSpace(p.Email)).Select(p => p.LinkedUserId!.Value)).ToList();
                foreach (var muid in missingEmailsUserIds)
                {
                    var baseUser = await _userRepository.GetByIdAsync(muid, cancellationToken, false);
                    if (baseUser != null && !string.IsNullOrWhiteSpace(baseUser.Email))
                    {
                        targetList.Add((baseUser.Email, string.IsNullOrWhiteSpace(baseUser.DisplayName) ? baseUser.Email : baseUser.DisplayName));
                    }
                }
            }
        }

        // Send cancellation emails to pending approvers
        foreach (var target in targetList)
        {
            await _emailService.SendFormCancelledEmailAsync(
                toEmail: target.Email,
                assigneeName: target.Name,
                formRequestNo: formReq.RequestNo,
                formRequestId: formReq.Id,
                formTypeName: formTypeName,
                requesterName: requesterName,
                requesterCompany: "Erkurt", // Can be dynamic if needed
                attachments: null,
                cancellationToken: cancellationToken
            );
        }

        return true;
    }
}
