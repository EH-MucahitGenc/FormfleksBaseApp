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

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.SaveDraft;

public sealed class SaveDraftCommandHandler : IRequestHandler<SaveDraftCommand, FormRequestResultDto>
{
    private readonly IDynamicFormsDbContext _db;

    public SaveDraftCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<FormRequestResultDto> Handle(SaveDraftCommand request, CancellationToken ct)
    {
        var dto = request.Request;
        FormRequestEntity req;

        if (dto.RequestId.HasValue && dto.RequestId.Value != Guid.Empty)
        {
            req = await _db.FormRequests
                .FirstOrDefaultAsync(r => r.Id == dto.RequestId.Value, ct)
                ?? throw new BusinessException("Kayıt bulunamadı.");

            if (req.Status != (short)FormRequestStatus.Draft && req.Status != (short)FormRequestStatus.ReturnedForRevision)
                throw new BusinessException("Sadece taslak (Draft) veya iade edilmiş durumundaki talepler güncellenebilir.");
            if (req.RequestorUserId != dto.RequestorUserId)
                throw new BusinessException("Bu talebi güncelleme yetkiniz yok.");

            // Eski değerleri sil
            var oldValues = await _db.FormRequestValues
                .Where(v => v.RequestId == req.Id).ToListAsync(ct);
            _db.FormRequestValues.RemoveRange(oldValues);
        }
        else
        {
            var formType = await _db.FormTypes.AsNoTracking().FirstOrDefaultAsync(f => f.Id == dto.FormTypeId, ct)
                ?? throw new BusinessException("Form şablonu bulunamadı.");

            var allowedRoles = string.IsNullOrWhiteSpace(formType.AllowedCreateRoleCodesJson)
                ? null
                : System.Text.Json.JsonSerializer.Deserialize<List<string>>(formType.AllowedCreateRoleCodesJson);

            var userRoleIds = await _db.UserRoles
                .AsNoTracking()
                .Where(ur => ur.UserId == dto.RequestorUserId)
                .Select(ur => ur.RoleId)
                .ToListAsync(ct);
                
            var userRoles = await _db.Roles
                .AsNoTracking()
                .Where(r => userRoleIds.Contains(r.Id))
                .Select(r => r.Code)
                .ToListAsync(ct);

            var isAdmin = userRoles.Any(r => r.Equals("Admin", StringComparison.OrdinalIgnoreCase) || r.Equals("Administrator", StringComparison.OrdinalIgnoreCase));
            var isIK = userRoles.Any(r => r.Equals("IK", StringComparison.OrdinalIgnoreCase) || r.Equals("HR", StringComparison.OrdinalIgnoreCase));

            // System forms can only be manually created by IK or Admin
            if (!string.IsNullOrEmpty(formType.SystemUsageType) && !isAdmin && !isIK)
            {
                throw new BusinessException("Sistem formlarını manuel olarak başlatma yetkiniz bulunmamaktadır.");
            }

            if (!isAdmin && allowedRoles != null && allowedRoles.Any())
            {
                if (!allowedRoles.Intersect(userRoles, StringComparer.OrdinalIgnoreCase).Any())
                {
                    throw new BusinessException("Bu formu başlatma yetkiniz bulunmamaktadır.");
                }
            }

            req = new FormRequestEntity
            {
                FormTypeId = dto.FormTypeId,
                RequestNo = "REQ-" + DateTime.UtcNow.ToString("yyyyMMdd-HHmmss") + "-" + Guid.NewGuid().ToString("N").Substring(0, 4).ToUpperInvariant(),
                RequestorUserId = dto.RequestorUserId,
                Status = (short)FormRequestStatus.Draft,
                CreatedAt = DateTime.UtcNow
            };
            _db.FormRequests.Add(req);
        }

        await _db.SaveChangesAsync(ct);

        // Alan kimlikleri için form alanlarını bulalım
        var formFields = await _db.FormFields
            .AsNoTracking()
            .Where(f => f.FormTypeId == req.FormTypeId)
            .ToListAsync(ct);

        // Yeni değerleri ekle
        foreach (var v in dto.Values)
        {
            var fieldDef = formFields.FirstOrDefault(f => 
                string.Equals(f.FieldKey, v.FieldKey, StringComparison.OrdinalIgnoreCase));
            
            if (fieldDef == null)
                continue; // Ignore fields that do not belong to this form template

            _db.FormRequestValues.Add(new FormRequestValueEntity
            {
                RequestId = req.Id,
                FieldId = fieldDef.Id,
                FieldKey = fieldDef.FieldKey, // Ensure we use the exact casing from the DB
                ValueText = v.ValueText,
                ValueNumber = v.ValueNumber,
                ValueDateTime = v.ValueDateTime,
                ValueBool = v.ValueBool,
                ValueJson = v.ValueJson
            });
        }

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
