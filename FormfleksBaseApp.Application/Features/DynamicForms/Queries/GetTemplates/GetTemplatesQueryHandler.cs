using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetTemplates;

public sealed class GetTemplatesQueryHandler : IRequestHandler<GetTemplatesQuery, IReadOnlyList<FormTemplateSummaryDto>>
{
    private readonly IDynamicFormsDbContext _db;

    public GetTemplatesQueryHandler(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<IReadOnlyList<FormTemplateSummaryDto>> Handle(GetTemplatesQuery request, CancellationToken ct)
    {
        var dbResult = await _db.FormTypes
            .AsNoTracking()
            .OrderBy(t => t.Name)
            .Select(t => new 
            {
                t.Id,
                t.Code,
                t.Name,
                t.Active,
                t.CreatedAt,
                t.AllowedCreateRoleCodesJson,
                t.AllowedReportRoleCodesJson
            })
            .ToListAsync(ct);

        return dbResult.Select(t => new FormTemplateSummaryDto
        {
            FormTypeId = t.Id,
            Code = t.Code,
            Name = t.Name,
            Active = t.Active,
            CreatedAt = t.CreatedAt,
            AllowedCreateRoleCodes = !string.IsNullOrEmpty(t.AllowedCreateRoleCodesJson) 
                ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(t.AllowedCreateRoleCodesJson) 
                : new List<string>(),
            AllowedReportRoleCodes = !string.IsNullOrEmpty(t.AllowedReportRoleCodesJson) 
                ? System.Text.Json.JsonSerializer.Deserialize<List<string>>(t.AllowedReportRoleCodesJson) 
                : new List<string>()
        }).ToList();
    }
}
