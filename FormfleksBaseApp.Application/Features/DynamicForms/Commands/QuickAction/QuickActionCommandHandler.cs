using System.Security.Claims;
using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.DynamicForms.Commands.ExecuteApprovalAction;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.QuickAction;

/// <summary>
/// E-posta üzerinden (Magic Link) gelen hızlı aksiyon (Quick Action) isteklerini işleyen handler.
/// Bu handler şu işlemleri gerçekleştirir:
/// 1. Token'ı çözerek işlemi yapmaya çalışan UserId ve ApprovalId bilgilerini doğrular.
/// 2. İlgili onay adımının veritabanında "Bekliyor (Pending)" statüsünde olup olmadığını kontrol eder.
/// 3. Doğrulamalar başarılı olursa, form sürecinin kendi doğal iş akışını (ExecuteApprovalActionCommand) tetikler.
/// Bu sayede Magic Link mimarisi, form akış motorunu veya tarihçe kayıt süreçlerini by-pass etmeden,
/// mevcut iş mantığına (CQRS) %100 sadık kalarak güvenli bir işlem sağlar.
/// </summary>
public sealed class QuickActionCommandHandler : IRequestHandler<QuickActionCommand, bool>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly ITokenService _tokenService;
    private readonly ISender _sender;
    private readonly IUserRepository _userRepo;

    public QuickActionCommandHandler(IDynamicFormsDbContext db, ITokenService tokenService, ISender sender, IUserRepository userRepo)
    {
        _db = db;
        _tokenService = tokenService;
        _sender = sender;
        _userRepo = userRepo;
    }

    public async Task<bool> Handle(QuickActionCommand request, CancellationToken cancellationToken)
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
            if (approval.Status == (short)ApprovalStatus.Cancelled)
                throw new BusinessException("Bu form talep sahibi tarafından iptal edilmiştir.");

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

        short actionType = request.ActionType.ToLowerInvariant() switch
        {
            "approve" => 1,
            "reject" => 2,
            "return" => 3,
            _ => throw new BusinessException("Geçersiz işlem türü.")
        };

        if (actionType != 1 && string.IsNullOrWhiteSpace(request.Comment))
            throw new BusinessException("Red veya İade işlemlerinde açıklama girmek zorunludur.");

        var executeCmd = new ExecuteApprovalActionCommand(new FormfleksBaseApp.DynamicForms.Business.Contracts.ApprovalActionRequestDto
        {
            RequestId = approval.RequestId,
            ApprovalId = approval.Id,
            ActorUserId = userId,
            ApprovalConcurrencyToken = approval.ConcurrencyToken,
            ActionType = (ApprovalActionType)actionType,
            Comment = request.Comment
        });

        var result = await _sender.Send(executeCmd, cancellationToken);
        
        return result.Success;
    }
}
