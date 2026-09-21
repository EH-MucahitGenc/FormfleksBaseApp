using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Features.Surveys.Common;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.Domain.Entities.Surveys;
using FormfleksBaseApp.Domain.Enums.Surveys;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Text.Json;

namespace FormfleksBaseApp.Application.Features.Surveys.Campaigns.Access;

public record CampaignAccessEntry(Guid UserId, string DisplayName, string Email, bool IsActiveUser,
    SurveyViewerAccessLevel AccessLevel, bool IsImplicit, bool IsEffective, DateTime? GrantedAt, DateTime? RevokedAt, DateTime? ValidUntil);
public record CampaignAccessDto(string Title, bool IsAnonymous, List<CampaignAccessEntry> Entries);
public record GetCampaignAccessQuery(Guid CampaignId, Guid ActorUserId) : IRequest<CampaignAccessDto>;
public record SetCampaignAccessCommand(Guid CampaignId, Guid UserId, SurveyViewerAccessLevel AccessLevel,
    bool Revoke, string Reason, DateTime? ValidUntil, Guid ActorUserId) : IRequest;

public class GetCampaignAccessQueryHandler(ISurveyDbContext context, ISurveyAuthorizationService auth, IUserRepository users)
    : IRequestHandler<GetCampaignAccessQuery, CampaignAccessDto>
{
    public async Task<CampaignAccessDto> Handle(GetCampaignAccessQuery request, CancellationToken ct)
    {
        await auth.EnsureCampaignPermissionAsync(request.ActorUserId, request.CampaignId, SurveyAction.ManageCampaignAccess, ct);
        var campaign = await context.SurveyCampaigns.AsNoTracking().Include(c => c.ResultViewers)
            .SingleOrDefaultAsync(c => c.Id == request.CampaignId, ct) ?? throw new NotFoundException("Kampanya bulunamadı.");
        var ids = campaign.ResultViewers.Select(v => v.UserId)
            .Concat(new[] { campaign.OwnerUserId, campaign.CreatedByUserId }.Where(id => id.HasValue).Select(id => id!.Value)).Distinct();
        var entries = new List<CampaignAccessEntry>();
        var now = DateTime.UtcNow;
        foreach (var id in ids)
        {
            var user = await users.GetByIdAsync(id, ct, false);
            var viewer = campaign.ResultViewers.SingleOrDefault(v => v.UserId == id);
            var effective = user?.Active == true && (viewer == null || (viewer.Active &&
                (!viewer.RevokedAt.HasValue || viewer.RevokedAt > now) &&
                (!viewer.ValidFrom.HasValue || viewer.ValidFrom <= now) &&
                (!viewer.ValidUntil.HasValue || viewer.ValidUntil >= now)));
            entries.Add(new(id, user?.DisplayName ?? user?.Email ?? "Silinmiş kullanıcı", user?.Email ?? "",
                user?.Active == true, viewer?.AccessLevel ?? SurveyViewerAccessLevel.AggregateOnly,
                viewer == null, effective, viewer?.GrantedAt, viewer?.RevokedAt, viewer?.ValidUntil));
        }
        return new(campaign.Title, campaign.IsAnonymous, entries.OrderBy(e => e.DisplayName).ToList());
    }
}

public class SetCampaignAccessCommandHandler(ISurveyDbContext context, ISurveyAuthorizationService auth, IUserRepository users)
    : IRequestHandler<SetCampaignAccessCommand>
{
    public async Task Handle(SetCampaignAccessCommand request, CancellationToken ct)
    {
        await auth.EnsureCampaignPermissionAsync(request.ActorUserId, request.CampaignId, SurveyAction.ManageCampaignAccess, ct);
        var campaign = await context.SurveyCampaigns.SingleOrDefaultAsync(c => c.Id == request.CampaignId, ct)
            ?? throw new NotFoundException("Kampanya bulunamadı.");
        if (request.UserId == Guid.Empty || !Enum.IsDefined(request.AccessLevel))
            throw new BusinessException("Geçerli kullanıcı ve erişim seviyesi seçin.");
        if (string.IsNullOrWhiteSpace(request.Reason) || request.Reason.Length > 500)
            throw new BusinessException("Yetki değişikliği gerekçesi zorunludur ve en fazla 500 karakter olabilir.");
        var now = DateTime.UtcNow;
        if (!request.Revoke && request.ValidUntil.HasValue && request.ValidUntil <= now)
            throw new BusinessException("Yetki bitiş tarihi gelecekte olmalıdır.");
        var target = await users.GetByIdAsync(request.UserId, ct, false);
        if (!request.Revoke && target?.Active != true)
            throw new BusinessException("Yalnızca aktif sistem kullanıcılarına izleme yetkisi verilebilir.");
        var viewer = await context.SurveyResultViewers.SingleOrDefaultAsync(
            v => v.SurveyCampaignId == request.CampaignId && v.UserId == request.UserId, ct);
        if (viewer == null && request.Revoke && campaign.OwnerUserId != request.UserId && campaign.CreatedByUserId != request.UserId)
            throw new BusinessException("Kaldırılacak erişim bulunamadı.");
        var previous = viewer == null ? null : new { viewer.AccessLevel, viewer.Active, viewer.ValidUntil, viewer.RevokedAt };
        if (viewer == null)
        {
            viewer = new SurveyResultViewer { Id = Guid.NewGuid(), SurveyCampaignId = campaign.Id, UserId = request.UserId };
            context.SurveyResultViewers.Add(viewer);
        }
        if (request.Revoke)
        {
            viewer.Active = false;
            viewer.RevokedAt = now;
            viewer.RevokedByUserId = request.ActorUserId;
        }
        else
        {
            viewer.Active = true;
            viewer.AccessLevel = request.AccessLevel;
            viewer.GrantedAt = now;
            viewer.GrantedByUserId = request.ActorUserId;
            viewer.ValidFrom = now;
            viewer.ValidUntil = request.ValidUntil;
            viewer.RevokedAt = null;
            viewer.RevokedByUserId = null;
        }
        await context.SaveAccessChangesAsync(new AuditLogEntity
        {
            Id = Guid.NewGuid(), EntityType = "SurveyCampaign", EntityId = campaign.Id,
            ActionType = request.Revoke ? "CampaignAccessRevoked" : "CampaignAccessGranted",
            ActorUserId = request.ActorUserId, CreatedAt = now,
            DetailJson = JsonSerializer.Serialize(new { ViewerUserId = request.UserId, Previous = previous,
                request.AccessLevel, request.ValidUntil, Reason = request.Reason.Trim() })
        }, ct);
    }
}
