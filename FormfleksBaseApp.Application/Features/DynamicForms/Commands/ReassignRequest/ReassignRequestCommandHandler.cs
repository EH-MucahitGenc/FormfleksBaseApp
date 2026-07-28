using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.AdminUsers.Interfaces;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.ReassignRequest;

public sealed class ReassignRequestCommandHandler : IRequestHandler<ReassignRequestCommand, Unit>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IAdminUserRepository _userRepository;
    private readonly IEmailService _emailService;

    public ReassignRequestCommandHandler(IDynamicFormsDbContext db, IAdminUserRepository userRepository, IEmailService emailService)
    {
        _db = db;
        _userRepository = userRepository;
        _emailService = emailService;
    }

    public async Task<Unit> Handle(ReassignRequestCommand request, CancellationToken ct)
    {
        var formRequest = await _db.FormRequests
            .FirstOrDefaultAsync(r => r.Id == request.RequestId, ct)
            ?? throw new BusinessException("Form talebi bulunamadı.");

        // Sadece Taslak durumundakiler devredilebilir
        if (formRequest.Status != (short)FormRequestStatus.Draft)
            throw new BusinessException("Sadece taslak statüsündeki formlar devredilebilir.");

        // Yetki Kontrolü (Form sahibi veya Admin devredebilir, ya da iki taraf da Global İK ise devredebilir)
        if (!request.IsAdmin && formRequest.RequestorUserId != request.CurrentUserId)
        {
            var isCurrentUserGlobalIk = await _db.UserLocationRoles.AnyAsync(lr => lr.UserId == request.CurrentUserId && lr.IsActive && lr.IsGlobalManager, ct);
            var isFormRequestorGlobalIk = await _db.UserLocationRoles.AnyAsync(lr => lr.UserId == formRequest.RequestorUserId && lr.IsActive && lr.IsGlobalManager, ct);
            if (!(isCurrentUserGlobalIk && isFormRequestorGlobalIk))
            {
                throw new BusinessException("Bu formu devretme yetkiniz bulunmuyor.");
            }
        }

        // Yeni kullanıcının bilgilerini al (mail göndermek için)
        var newOwner = await _userRepository.GetUserByIdWithRolesAsync(request.NewOwnerUserId, ct);
        if (newOwner == null)
            throw new BusinessException("Devredilecek kullanıcı bulunamadı.");

        // İsteği devredenin bilgilerini al
        var currentOwner = await _userRepository.GetUserByIdWithRolesAsync(request.CurrentUserId, ct);
        var assignerName = currentOwner?.DisplayName ?? currentOwner?.Email ?? "Sistem Yöneticisi";

        formRequest.RequestorUserId = request.NewOwnerUserId;
        await _db.SaveChangesAsync(ct);

        // Bildirim mailini gönder
        if (!string.IsNullOrWhiteSpace(newOwner.Email))
        {
            var formType = await _db.FormTypes.FirstOrDefaultAsync(t => t.Id == formRequest.FormTypeId, ct);
            var formTypeName = formType?.Name ?? "Form";
            
            await _emailService.SendDraftReassignedEmailAsync(
                toEmail: newOwner.Email,
                assigneeName: newOwner.DisplayName ?? newOwner.Email,
                formRequestNo: formRequest.RequestNo,
                formRequestId: formRequest.Id,
                formTypeName: formTypeName,
                assignerName: assignerName,
                requesterCompany: "Erkurt Holding", // Opsiyonel, veritabanından çekilebilir
                cancellationToken: ct
            );
        }

        return Unit.Value;
    }
}
