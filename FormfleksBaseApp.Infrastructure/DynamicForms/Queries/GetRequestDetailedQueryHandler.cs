using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Queries.GetRequestDetailed;
using FormfleksBaseApp.DynamicForms.DataAccess;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using MediatR;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.DynamicForms.Infrastructure.Queries;

public sealed class GetRequestDetailedQueryHandler
    : IRequestHandler<GetRequestDetailedQuery, FormRequestDetailedDto?>
{
    private readonly DynamicFormsDbContext _db;

    public GetRequestDetailedQueryHandler(DynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<FormRequestDetailedDto?> Handle(GetRequestDetailedQuery query, CancellationToken ct)
    {
        var request = await _db.FormRequests
            .FirstOrDefaultAsync(x => x.Id == query.RequestId, ct);

        if (request is null || request.RequestorUserId != query.RequestorUserId)
            return null;

        var formType = await _db.FormTypes
            .FirstOrDefaultAsync(x => x.Id == request.FormTypeId, ct);

        var values = await _db.FormRequestValues
            .Where(x => x.RequestId == query.RequestId)
            .ToListAsync(ct);

        return new FormRequestDetailedDto
        {
            RequestId = request.Id,
            RequestNo = request.RequestNo,
            FormTypeCode = formType?.Code ?? "",
            Status = (FormRequestStatus)request.Status,
            ConcurrencyToken = request.ConcurrencyToken,
            Values = values.Select(v => new FormRequestValueDto
            {
                FieldKey = v.FieldKey,
                ValueText = v.ValueText
                    ?? v.ValueNumber?.ToString()
                    ?? v.ValueDateTime?.ToString("O")
                    ?? v.ValueBool?.ToString().ToLowerInvariant()
            }).ToList()
        };
    }
}
