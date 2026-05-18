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

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.DeleteRequest;

public sealed class DeleteRequestCommandHandler : IRequestHandler<DeleteRequestCommand, bool>
{
    private readonly IDynamicFormsDbContext _db;

    public DeleteRequestCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<bool> Handle(DeleteRequestCommand request, CancellationToken cancellationToken)
    {
        var formReq = await _db.FormRequests
            .FirstOrDefaultAsync(r => r.Id == request.RequestId, cancellationToken)
            ?? throw new BusinessException("Kayıt bulunamadı.");

        // Sadece formu oluşturan kişi taslağı silebilir.
        if (formReq.RequestorUserId != request.ActorUserId)
            throw new BusinessException("Sadece formu oluşturan kişi bu taslağı silebilir.");

        // Form sadece Draft (Taslak) statüsünde silinebilir. Gönderilmiş veya onaydaki formlar silinemez, ancak iptal edilebilir.
        if (formReq.Status != (short)FormRequestStatus.Draft)
            throw new BusinessException("Sadece taslak (Draft) statüsündeki formlar silinebilir.");

        // Taslağa ait girilmiş form değerlerini bul ve sil
        var formValues = await _db.FormRequestValues
            .Where(v => v.RequestId == request.RequestId)
            .ToListAsync(cancellationToken);
            
        _db.FormRequestValues.RemoveRange(formValues);

        // Ana form kaydını sil
        _db.FormRequests.Remove(formReq);

        // Audit Log ekleyelim (Silme işlemi veritabanından kalıcı olarak yapıldığı için iz bırakmak önemlidir)
        var detailObject = new { Reason = "Taslak form kullanıcı tarafından silindi." };
        _db.AuditLogs.Add(new AuditLogEntity
        {
            Id = Guid.NewGuid(),
            EntityType = "FormRequest",
            EntityId = request.RequestId,
            ActorUserId = request.ActorUserId,
            ActionType = "DeleteDraft",
            CreatedAt = DateTime.UtcNow,
            DetailJson = System.Text.Json.JsonSerializer.Serialize(detailObject)
        });

        await _db.SaveChangesAsync(cancellationToken);

        return true;
    }
}
