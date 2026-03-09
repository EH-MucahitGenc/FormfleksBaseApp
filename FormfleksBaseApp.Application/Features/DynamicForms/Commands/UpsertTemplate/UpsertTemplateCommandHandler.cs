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

            // Eski section ve field'ları temizle
            var oldSections = await _db.FormSections.Where(s => s.FormTypeId == formType.Id).ToListAsync(ct);
            var oldFields = await _db.FormFields.Where(f => f.FormTypeId == formType.Id).ToListAsync(ct);
            _db.FormFields.RemoveRange(oldFields);
            _db.FormSections.RemoveRange(oldSections);
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

        foreach (var secDto in dto.Sections)
        {
            var sec = new FormSectionEntity
            {
                FormTypeId = formType.Id,
                Title = secDto.Title,
                SortOrder = secDto.SortOrder
            };
            _db.FormSections.Add(sec);
            await _db.SaveChangesAsync(ct); // SectionId oluşsun

            // Alanlar bu section'a bağlanacaksa
            var sectionFields = dto.Fields
                .Where(f => f.SectionTitle == secDto.Title);

            foreach (var fldDto in sectionFields)
            {
                _db.FormFields.Add(new FormFieldEntity
                {
                    FormTypeId = formType.Id,
                    SectionId = sec.Id,
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
