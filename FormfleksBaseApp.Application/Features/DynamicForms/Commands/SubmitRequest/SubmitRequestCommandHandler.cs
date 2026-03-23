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

    public SubmitRequestCommandHandler(IDynamicFormsDbContext db, IApprovalEngineService engine, IEmailService emailService, IUserRepository userRepository, ILogger<SubmitRequestCommandHandler> logger)
    {
        _db = db;
        _engine = engine;
        _emailService = emailService;
        _userRepository = userRepository;
        _logger = logger;
    }

    public async Task<FormRequestResultDto> Handle(SubmitRequestCommand request, CancellationToken ct)
    {
        var dto = request.Request;
        var req = await _db.FormRequests
            .FirstOrDefaultAsync(r => r.Id == dto.RequestId, ct)
            ?? throw new BusinessException("Kayıt bulunamadı.");

        if (req.Status != (short)FormRequestStatus.Draft)
            throw new BusinessException("Sadece taslak (Draft) durumundaki formlar onaya gönderilebilir.");

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
                
                // Email Bildirimi (Background Queue'ya atılır)
                if (assignedUser.HasValue)
                {
                    _logger.LogInformation("SubmitRequest: Starting email notification process for Assignee UserId: {AssigneeUserId}", assignedUser.Value);
                    var formType = await _db.FormTypes.AsNoTracking().FirstOrDefaultAsync(f => f.Id == req.FormTypeId, ct);
                    
                    var reqPers = await _db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == req.RequestorUserId && p.IsActive, ct);
                    var assgnPers = await _db.QdmsPersoneller.AsNoTracking().FirstOrDefaultAsync(p => p.LinkedUserId == assignedUser.Value && p.IsActive, ct);

                    string? targetEmail = assgnPers?.Email;
                    string assgnName = assgnPers != null ? $"{assgnPers.Adi} {assgnPers.Soyadi}" : "Bilinmeyen Sistem Kullanıcısı";
                    
                    if (string.IsNullOrWhiteSpace(targetEmail))
                    {
                        _logger.LogWarning("SubmitRequest: Assignee QDMS Email is empty. Falling back to Identity User table.");
                        var baseUser = await _userRepository.GetByIdAsync(assignedUser.Value, ct, false);
                        targetEmail = baseUser?.Email;
                        if (baseUser != null && !string.IsNullOrWhiteSpace(baseUser.DisplayName))
                            assgnName = baseUser.DisplayName;
                    }

                    string? reqEmail = reqPers?.Email;
                    string reqName = reqPers != null ? $"{reqPers.Adi} {reqPers.Soyadi}" : "Bilinmeyen Sistem Kullanıcısı";

                    if (string.IsNullOrWhiteSpace(reqEmail))
                    {
                        var baseReqUser = await _userRepository.GetByIdAsync(req.RequestorUserId, ct, false);
                        if (baseReqUser != null && !string.IsNullOrWhiteSpace(baseReqUser.DisplayName))
                            reqName = baseReqUser.DisplayName;
                    }

                    if (!string.IsNullOrWhiteSpace(targetEmail) && formType != null)
                    {
                        _logger.LogInformation("SubmitRequest: Final resolved target email: '{Email}', Name: '{Name}'", targetEmail, assgnName);
                        await _emailService.SendApprovalRequestEmailAsync(targetEmail, assgnName, req.RequestNo, formType.Name, reqName, ct);
                    }
                    else
                    {
                        _logger.LogError("SubmitRequest: Could not queue email! Target email is null for Assignee {AssigneeId}", assignedUser.Value);
                    }
                }
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
}
