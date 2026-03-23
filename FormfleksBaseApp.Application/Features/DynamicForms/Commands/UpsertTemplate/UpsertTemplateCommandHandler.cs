using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.UpsertTemplate;

public sealed class UpsertTemplateCommandHandler : IRequestHandler<UpsertTemplateCommand, FormTemplateSummaryDto>
{
    private readonly IDynamicFormsDbContext _db;

    public UpsertTemplateCommandHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<FormTemplateSummaryDto> Handle(UpsertTemplateCommand request, CancellationToken ct)
    {
        var dto = request.Request;
        FormTypeEntity formType;

        if (dto.FormTypeId.HasValue && dto.FormTypeId.Value != Guid.Empty)
        {
            formType = await _db.FormTypes
                .FirstOrDefaultAsync(t => t.Id == dto.FormTypeId.Value, ct)
                ?? throw new BusinessException("Şablon bulunamadı.");

            formType.Code = dto.Code;
            formType.Name = dto.Name;
            formType.Active = dto.Active;

            // Eski section ve field'ları geçici olarak silmek yerine güncelleyeceğiz.
            // Bu sayede Foreign Key kilitlenmelerini (form_request_values -> form_fields) engelliyoruz.
            var oldFields = await _db.FormFields.Where(f => f.FormTypeId == formType.Id).ToListAsync(ct);
            foreach(var field in oldFields)
            {
                field.Active = false; // Soft delete by default, will reactivate if matched
            }
        }
        else
        {
            formType = new FormTypeEntity
            {
                Code = dto.Code,
                Name = dto.Name,
                Active = dto.Active,
                CreatedByUserId = request.ActorUserId,
                CreatedAt = DateTime.UtcNow
            };
            _db.FormTypes.Add(formType);
        }

        await _db.SaveChangesAsync(ct); // ID oluşsun

        var oldSectionsList = await _db.FormSections.Where(s => s.FormTypeId == formType.Id).ToListAsync(ct);
        var oldFieldsList = await _db.FormFields.Where(f => f.FormTypeId == formType.Id).ToListAsync(ct);

        foreach (var secDto in dto.Sections)
        {
            var sec = oldSectionsList.FirstOrDefault(s => s.Title == secDto.Title);
            if (sec == null)
            {
                sec = new FormSectionEntity
                {
                    FormTypeId = formType.Id,
                    Title = secDto.Title ?? "Genel Bilgiler",
                    SortOrder = secDto.SortOrder
                };
                _db.FormSections.Add(sec);
                oldSectionsList.Add(sec);
            }
            else
            {
                sec.SortOrder = secDto.SortOrder;
            }
        }
        await _db.SaveChangesAsync(ct); 

        var defaultSection = oldSectionsList.OrderBy(s => s.SortOrder).FirstOrDefault();

        foreach (var fldDto in dto.Fields)
        {
            var targetSec = oldSectionsList.FirstOrDefault(s => s.Title == fldDto.SectionTitle) ?? defaultSection;
            
            var existingField = oldFieldsList.FirstOrDefault(f => f.FieldKey == fldDto.FieldKey);
            if (existingField != null)
            {
                existingField.SectionId = targetSec?.Id;
                existingField.Label = fldDto.Label;
                existingField.FieldType = (short)fldDto.FieldType;
                existingField.IsRequired = fldDto.IsRequired;
                existingField.SortOrder = fldDto.SortOrder;
                existingField.Placeholder = fldDto.Placeholder;
                existingField.HelpText = fldDto.HelpText;
                existingField.DefaultValue = fldDto.DefaultValue;
                existingField.VisibilityRuleJson = fldDto.VisibilityRuleJson;
                existingField.ValidationRuleJson = fldDto.ValidationRuleJson;
                existingField.OptionsJson = fldDto.OptionsJson;
                existingField.Active = fldDto.Active;
            }
            else
            {
                _db.FormFields.Add(new FormFieldEntity
                {
                    FormTypeId = formType.Id,
                    SectionId = targetSec?.Id,
                    FieldKey = fldDto.FieldKey,
                    Label = fldDto.Label,
                    FieldType = (short)fldDto.FieldType,
                    IsRequired = fldDto.IsRequired,
                    SortOrder = fldDto.SortOrder,
                    Placeholder = fldDto.Placeholder,
                    HelpText = fldDto.HelpText,
                    DefaultValue = fldDto.DefaultValue,
                    VisibilityRuleJson = fldDto.VisibilityRuleJson,
                    ValidationRuleJson = fldDto.ValidationRuleJson,
                    OptionsJson = fldDto.OptionsJson,
                    Active = fldDto.Active
                });
            }
        }

        await _db.SaveChangesAsync(ct);

        return new FormTemplateSummaryDto
        {
            FormTypeId = formType.Id,
            Code = formType.Code,
            Name = formType.Name,
            Active = formType.Active,
            CreatedAt = formType.CreatedAt
        };
    }
}
