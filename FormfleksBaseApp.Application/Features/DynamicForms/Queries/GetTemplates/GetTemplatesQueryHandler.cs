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
        return await _db.FormTypes
            .AsNoTracking()
            .OrderBy(t => t.Name)
            .Select(t => new FormTemplateSummaryDto
            {
                FormTypeId = t.Id,
                Code = t.Code,
                Name = t.Name,
                Active = t.Active,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync(ct);
    }
}
