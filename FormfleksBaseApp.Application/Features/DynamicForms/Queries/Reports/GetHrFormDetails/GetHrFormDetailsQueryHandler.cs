using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.DynamicForms.Business.Contracts.Reports;
using MediatR;
using Microsoft.EntityFrameworkCore;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetHrFormDetails;

public sealed class GetHrFormDetailsQueryHandler : IRequestHandler<GetHrFormDetailsQuery, List<HrFormDetailItemDto>>
{
    private readonly IDynamicFormsDbContext _db;
    private readonly FormfleksBaseApp.Application.Auth.Interfaces.IUserRepository _userRepository;

    public GetHrFormDetailsQueryHandler(IDynamicFormsDbContext db, FormfleksBaseApp.Application.Auth.Interfaces.IUserRepository userRepository)
    {
        _db = db;
        _userRepository = userRepository;
    }

    public async Task<List<HrFormDetailItemDto>> Handle(GetHrFormDetailsQuery request, CancellationToken ct)
    {
        var query = _db.FormRequests
            .AsNoTracking()
            .Where(r => r.Status != (short)FormfleksBaseApp.DynamicForms.Domain.Enums.FormRequestStatus.Draft);

        if (request.RequestorUserId.HasValue)
        {
            query = query.Where(r => r.RequestorUserId == request.RequestorUserId.Value);
        }

        if (request.FormTypeId.HasValue)
        {
            query = query.Where(r => r.FormTypeId == request.FormTypeId.Value);
        }

        if (request.StartDate.HasValue)
        {
            query = query.Where(r => r.CreatedAt >= request.StartDate.Value);
        }

        if (request.EndDate.HasValue)
        {
            query = query.Where(r => r.CreatedAt <= request.EndDate.Value);
        }

        var results = await query
            .OrderByDescending(r => r.CreatedAt)
            .Select(r => new HrFormDetailItemDto
            {
                FormRequestId = r.Id,
                FormRequestNo = r.RequestNo,
                FormTypeName = "", // Will fill below
                RequestorName = "", // Will fill below
                CreatedAt = r.CreatedAt,
                Status = (int)r.Status,
                CompletedAt = r.CompletedAt
            })
            .ToListAsync(ct);

        if (!results.Any()) return results;

        var requestIds = results.Select(r => r.FormRequestId).ToList();

        // Fetch Subject Person Name from FormRequestValues and all form values
        var formValues = await (from v in _db.FormRequestValues.AsNoTracking()
                                join f in _db.FormFields.AsNoTracking() on v.FieldId equals f.Id
                                where requestIds.Contains(v.RequestId)
                                select new { v.RequestId, v.ValueText, f.FieldKey, f.Label, f.FieldType, f.OptionsJson, f.SortOrder }).ToListAsync(ct);

        // Group values by RequestId in memory, ensuring they are ordered by SortOrder
        var groupedValues = formValues.GroupBy(x => x.RequestId).ToDictionary(g => g.Key, g => g.OrderBy(v => v.SortOrder).ToList());

        // Build grid column label mapping from grid-type fields (FieldType == 11)
        var gridColumnLabelMap = new Dictionary<string, string>();
        var gridFields = formValues.Where(v => v.FieldType == 11 && !string.IsNullOrWhiteSpace(v.OptionsJson)).Select(v => v.OptionsJson).Distinct();
        foreach (var optionsJson in gridFields)
        {
            try
            {
                using var doc = System.Text.Json.JsonDocument.Parse(optionsJson!);
                System.Text.Json.JsonElement columnsArray;
                // OptionsJson can be either an array of columns or { columns: [...] }
                if (doc.RootElement.ValueKind == System.Text.Json.JsonValueKind.Array)
                    columnsArray = doc.RootElement;
                else if (doc.RootElement.TryGetProperty("columns", out var cols))
                    columnsArray = cols;
                else continue;

                foreach (var col in columnsArray.EnumerateArray())
                {
                    if (col.TryGetProperty("dataField", out var df) && col.TryGetProperty("label", out var lbl))
                    {
                        var dataField = df.GetString();
                        var label = lbl.GetString();
                        if (!string.IsNullOrWhiteSpace(dataField) && !string.IsNullOrWhiteSpace(label))
                        {
                            gridColumnLabelMap.TryAdd(dataField, label);
                        }
                    }
                }
            }
            catch { /* skip invalid JSON */ }
        }


        // Fetch User Info mapping
        var requestorIds = query.Select(r => r.RequestorUserId).Distinct().ToList();
        
        var users = await _db.QdmsPersoneller
            .AsNoTracking()
            .Where(p => p.LinkedUserId.HasValue && requestorIds.Contains(p.LinkedUserId.Value))
            .ToListAsync(ct);
            
        // Fallback to base users
        var baseUsers = new Dictionary<Guid, string>();
        foreach (var reqId in requestorIds)
        {
            if (!users.Any(u => u.LinkedUserId == reqId))
            {
                var baseUser = await _userRepository.GetByIdAsync(reqId, ct, false);
                if (baseUser != null && !string.IsNullOrWhiteSpace(baseUser.DisplayName))
                    baseUsers[reqId] = baseUser.DisplayName;
            }
        }

        var formTypes = await _db.FormTypes
            .AsNoTracking()
            .ToListAsync(ct);

        var requestInfoMap = await query
            .Where(r => requestIds.Contains(r.Id))
            .Select(r => new { r.Id, r.RequestorUserId, r.FormTypeId })
            .ToDictionaryAsync(r => r.Id, ct);

        foreach (var item in results)
        {
            var originalReq = requestInfoMap.GetValueOrDefault(item.FormRequestId);
            var reqUserId = originalReq?.RequestorUserId ?? Guid.Empty;
            var formTypeId = originalReq?.FormTypeId ?? Guid.Empty;
            
            var user = users.FirstOrDefault(u => u.LinkedUserId == reqUserId);
            var fullName = "Bilinmeyen Kullanıcı";
            if (user != null && !string.IsNullOrWhiteSpace($"{user.Adi} {user.Soyadi}".Trim()))
            {
                fullName = $"{user.Adi} {user.Soyadi}";
            }
            else if (baseUsers.ContainsKey(reqUserId))
            {
                fullName = baseUsers[reqUserId];
            }

            var formType = formTypes.FirstOrDefault(f => f.Id == formTypeId);
            var formTypeName = formType != null ? formType.Name : "Bilinmeyen Form";

            item.RequestorName = fullName;
            item.FormTypeName = formTypeName;

            if (groupedValues.TryGetValue(item.FormRequestId, out var values))
            {
                // Populate FormValues
                foreach (var val in values)
                {
                    if (!string.IsNullOrWhiteSpace(val.ValueText) && !string.IsNullOrWhiteSpace(val.Label))
                    {
                        // Some labels might be duplicated, we can just use the first non-empty value
                        if (!item.FormValues.ContainsKey(val.Label))
                        {
                            item.FormValues[val.Label] = val.ValueText;
                            item.OrderedFieldLabels.Add(val.Label); // Maintain ordered insertion
                        }
                    }
                }

                // Determine SubjectPersonName
                var subjectField = values.FirstOrDefault(v => 
                    (v.FieldKey == "adi_soyadi" || v.FieldKey == "ad_soyad" || v.FieldKey == "personel_adi" || v.FieldKey == "calisan_adi" || v.FieldKey == "personel")
                    || (v.Label != null && (
                        v.Label.Contains("Adı", StringComparison.OrdinalIgnoreCase) && v.Label.Contains("Soyadı", StringComparison.OrdinalIgnoreCase) ||
                        v.Label.Contains("İlgili Kişi", StringComparison.OrdinalIgnoreCase) ||
                        v.Label.Contains("Personel Ad", StringComparison.OrdinalIgnoreCase) ||
                        v.Label.Contains("Çalışan Ad", StringComparison.OrdinalIgnoreCase)
                    ))
                );

                item.SubjectPersonName = subjectField?.ValueText;
            }

            // Set grid column labels for this item
            item.GridColumnLabels = gridColumnLabelMap;
        }

        return results;
    }
}
