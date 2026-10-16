using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Constants;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.ClaimDraft;

public sealed class ClaimDraftCommandHandler : IRequestHandler<ClaimDraftCommand, FormRequestResultDto>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly IOrganizationAssigneeResolver _organizationResolver;

    public ClaimDraftCommandHandler(
        IDynamicFormsDbContext db,
        IOrganizationAssigneeResolver organizationResolver)
    {
        _db = db;
        _organizationResolver = organizationResolver;
    }

    public async Task<FormRequestResultDto> Handle(ClaimDraftCommand command, CancellationToken cancellationToken)
    {
        var request = await _db.FormRequests
            .FirstOrDefaultAsync(x => x.Id == command.RequestId, cancellationToken)
            ?? throw new BusinessException("Taslak bulunamadı.");

        if (request.Status != (short)FormRequestStatus.Draft)
            throw new BusinessException("Yalnızca taslak durumundaki formlar üstlenilebilir.");

        if (!await _organizationResolver.IsEligibleAssigneeAsync(command.ActorUserId, cancellationToken))
            throw new BusinessException("Gri yaka personel değerlendirme taslağı üstlenemez.");

        if (request.RequestorUserId == command.ActorUserId)
            return ToResult(request);

        if (request.RequestorUserId != ProbationFormConstants.SystemUserId)
            throw new BusinessException("Bu taslak başka bir kullanıcı tarafından üstlenildi.");

        var isCandidate = await _db.FormRequestAssignments
            .AsNoTracking()
            .AnyAsync(x => x.RequestId == request.Id &&
                           x.UserId == command.ActorUserId &&
                           x.AssignmentType == (short)FormRequestAssignmentType.DraftEvaluator,
                cancellationToken);

        if (!isCandidate)
            throw new BusinessException("Bu taslağı üstlenme yetkiniz bulunmuyor.");

        request.RequestorUserId = command.ActorUserId;
        request.ConcurrencyToken++;
        _db.AuditLogs.Add(new AuditLogEntity
        {
            Id = Guid.NewGuid(),
            EntityType = "FormRequest",
            EntityId = request.Id,
            ActionType = "DraftClaimed",
            ActorUserId = command.ActorUserId,
            DetailJson = "{\"AssignmentType\":\"DraftEvaluator\"}",
            CreatedAt = DateTime.UtcNow
        });

        try
        {
            await _db.SaveChangesAsync(cancellationToken);
        }
        catch (DbUpdateConcurrencyException)
        {
            throw new BusinessException("Bu taslak başka bir kullanıcı tarafından az önce üstlenildi.");
        }

        return ToResult(request);
    }

    private static FormRequestResultDto ToResult(FormRequestEntity request) => new()
    {
        RequestId = request.Id,
        Status = (FormRequestStatus)request.Status,
        CurrentStepNo = request.CurrentStepNo,
        ConcurrencyToken = request.ConcurrencyToken
    };
}
