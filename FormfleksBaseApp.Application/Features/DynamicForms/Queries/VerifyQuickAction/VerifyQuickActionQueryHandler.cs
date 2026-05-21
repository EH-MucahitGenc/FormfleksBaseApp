using System.Security.Claims;
using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.VerifyQuickAction;

public sealed class VerifyQuickActionQueryHandler : IRequestHandler<VerifyQuickActionQuery, bool>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly IUserRepository _userRepo;

    public VerifyQuickActionQueryHandler(IDynamicFormsDbContext db, ITokenService tokenService, IUserRepository userRepo)
    {
        _db = db;
        _tokenService = tokenService;
        _userRepo = userRepo;
    }

    public async Task<bool> Handle(VerifyQuickActionQuery request, CancellationToken cancellationToken)
    {
        var principal = _tokenService.ValidateQuickActionToken(request.Token);
        if (principal == null)
            throw new BusinessException("Geçersiz veya süresi dolmuş işlem bağlantısı. Lütfen sisteme giriş yaparak işleminizi tamamlayın.");

        var approvalIdStr = principal.Claims.FirstOrDefault(c => c.Type == "ApprovalId")?.Value;
        var userIdStr = principal.Claims.FirstOrDefault(c => c.Type == ClaimTypes.NameIdentifier)?.Value;

        if (!Guid.TryParse(approvalIdStr, out var approvalId) || !Guid.TryParse(userIdStr, out var userId))
            throw new BusinessException("Bağlantı içeriği doğrulanamadı.");

        var approval = await _db.FormRequestApprovals
            .AsNoTracking()
            .FirstOrDefaultAsync(a => a.Id == approvalId, cancellationToken);

        if (approval == null)
            throw new BusinessException("İlgili onay adımı bulunamadı.");

        if (approval.Status != (short)ApprovalStatus.Pending)
        {
            string actionText = approval.Status switch
            {
                (short)ApprovalStatus.Approved => "Onay",
                (short)ApprovalStatus.Rejected => "Red",
                (short)ApprovalStatus.ReturnedForRevision => "İade",
                _ => "İşlem"
            };

            string actorName = "Yetkili";
            if (approval.ActionByUserId.HasValue)
            {
                var qdmsUser = await _db.QdmsPersoneller.AsNoTracking()
                    .FirstOrDefaultAsync(p => p.LinkedUserId == approval.ActionByUserId.Value, cancellationToken);
                
                if (qdmsUser != null)
                {
                    actorName = $"{qdmsUser.Adi} {qdmsUser.Soyadi}";
                }
                else
                {
                    var baseUser = await _userRepo.GetByIdAsync(approval.ActionByUserId.Value, cancellationToken, false);
                    if (baseUser != null && !string.IsNullOrWhiteSpace(baseUser.DisplayName))
                    {
                        actorName = baseUser.DisplayName;
                    }
                }
            }

            throw new BusinessException($"Bu adım daha önce {actorName} tarafından '{actionText}' işlemi ile tamamlanmıştır.");
        }

        return true;
    }
}
