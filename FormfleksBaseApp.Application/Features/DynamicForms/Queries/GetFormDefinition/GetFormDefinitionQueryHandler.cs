using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;
using Microsoft.EntityFrameworkCore;
using FormfleksBaseApp.Domain.Entities.DynamicForms;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetFormDefinition;

public sealed class GetFormDefinitionQueryHandler : IRequestHandler<GetFormDefinitionQuery, FormDefinitionDto?>
{
    private readonly IDynamicFormsDbContext _db;

    public GetFormDefinitionQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<FormDefinitionDto?> Handle(GetFormDefinitionQuery request, CancellationToken ct)
    {
        var inputCode = request.FormCode.Trim();
        
        var formType = await _db.FormTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Code == inputCode || t.Code.ToLower() == inputCode.ToLower(), ct);

        // Yukarıdaki ToLower() veritabanında LOWER() olarak çalışır.
        // Ama eğer C# tarafında Turkish locale ToLower('I') sorunu yaşıyorsak, fallback olarak EF.Functions kullanabiliriz.
        if (formType is null)
        {
             // Olası i/ı sorunu nedeniyle bir de InvariantCulture ile deneyelim
             formType = await _db.FormTypes
                .AsNoTracking()
                .FirstOrDefaultAsync(t => t.Code == inputCode && t.Active, ct);
                
             if (formType is null)
             {
                 // Tüm Active FormType'ları çekip Invariant ile C# tarafında eşleştir (küçük veri setinde güvenli)
                 var allActive = await _db.FormTypes.AsNoTracking().Where(x => x.Active).ToListAsync(ct);
                 formType = allActive.FirstOrDefault(t => string.Equals(t.Code.Trim(), inputCode, StringComparison.OrdinalIgnoreCase));
             }
        }
        else if (!formType.Active) 
        {
             formType = null;
        }

        if (formType is null) return null;

        var sections = await _db.FormSections
            .AsNoTracking()
            .Where(s => s.FormTypeId == formType.Id)
            .OrderBy(s => s.SortOrder)
            .ToListAsync(ct);

        var fields = await _db.FormFields
            .AsNoTracking()
            .Where(f => f.FormTypeId == formType.Id && f.Active)
            .OrderBy(f => f.SortOrder)
            .ToListAsync(ct);

        var sectionDtos = new List<FormSectionDto>();

        foreach (var sec in sections)
        {
            var fieldDtos = fields.Where(f => f.SectionId == sec.Id)
                .Select(fld => MapToFieldDto(fld)).ToList();

            sectionDtos.Add(new FormSectionDto
            {
                SectionId = sec.Id,
                Title = sec.Title,
                SortOrder = sec.SortOrder,
                Fields = fieldDtos
            });
        }

        var orphanedFields = fields.Where(f => f.SectionId == null || !sections.Any(s => s.Id == f.SectionId)).ToList();
        if (orphanedFields.Any())
        {
            sectionDtos.Add(new FormSectionDto
            {
                SectionId = Guid.Empty,
                Title = "Genel Bilgiler",
                SortOrder = -1,
                Fields = orphanedFields.Select(fld => MapToFieldDto(fld)).ToList()
            });
        }

        var allowedRoles = string.IsNullOrWhiteSpace(formType.AllowedCreateRoleCodesJson)
            ? null
            : System.Text.Json.JsonSerializer.Deserialize<List<string>>(formType.AllowedCreateRoleCodesJson);

        return new FormDefinitionDto
        {
            FormTypeId = formType.Id,
            Code = formType.Code,
            Name = formType.Name,
            Sections = sectionDtos.OrderBy(s => s.SortOrder).ToList(),
            AllowedCreateRoleCodes = allowedRoles
        };
    }

    private static FormFieldDto MapToFieldDto(FormFieldEntity fld)
    {
        return new FormFieldDto
        {
            FieldId = fld.Id,
            Key = fld.FieldKey,
            Label = fld.Label,
            FieldType = fld.FieldType,
            IsRequired = fld.IsRequired,
            SortOrder = fld.SortOrder,
            Placeholder = fld.Placeholder,
            HelpText = fld.HelpText,
            DefaultValue = fld.DefaultValue,
            OptionsJson = fld.OptionsJson,
            ValidationJson = fld.ValidationRuleJson,
            VisibilityRuleJson = fld.VisibilityRuleJson
        };
    }
}
