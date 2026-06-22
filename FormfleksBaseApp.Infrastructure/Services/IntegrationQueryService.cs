using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Contracts.DynamicForms.IntegrationQueries;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Infrastructure.Services;

public class IntegrationQueryService : IIntegrationQueryService
{
    private readonly IDynamicFormsDbContext _db;

    public IntegrationQueryService(IDynamicFormsDbContext db)
    {
        _db = db;
    }

    public async Task<List<IntegrationQueryDto>> GetAllQueriesAsync(CancellationToken ct = default)
    {
        var queries = await _db.IntegrationQueries.ToListAsync(ct);
        return queries.Select(MapToDto).ToList();
    }

    public async Task<List<IntegrationQueryLookupDto>> GetLookupQueriesAsync(CancellationToken ct = default)
    {
        return await _db.IntegrationQueries
            .Select(q => new IntegrationQueryLookupDto
            {
                Id = q.Id,
                Name = q.Name,
                ParametersJson = q.ParametersJson
            })
            .ToListAsync(ct);
    }

    public async Task<IntegrationQueryDto> GetQueryByIdAsync(Guid id, CancellationToken ct = default)
    {
        var query = await _db.IntegrationQueries.FirstOrDefaultAsync(q => q.Id == id, ct);
        if (query == null) throw new BusinessException("Query not found");
        return MapToDto(query);
    }

    public async Task<IntegrationQueryDto> CreateQueryAsync(IntegrationQueryUpsertDto dto, CancellationToken ct = default)
    {
        var entity = new IntegrationQueryEntity
        {
            Id = Guid.NewGuid(),
            Name = dto.Name,
            ConnectionName = dto.ConnectionName,
            QueryTemplate = dto.QueryTemplate,
            ParametersJson = dto.ParametersJson,
            Engine = (DbEngine)dto.Engine
        };

        _db.IntegrationQueries.Add(entity);
        await _db.SaveChangesAsync(ct);

        return MapToDto(entity);
    }

    public async Task<IntegrationQueryDto> UpdateQueryAsync(Guid id, IntegrationQueryUpsertDto dto, CancellationToken ct = default)
    {
        var entity = await _db.IntegrationQueries.FirstOrDefaultAsync(q => q.Id == id, ct);
        if (entity == null) throw new BusinessException("Query not found");

        entity.Name = dto.Name;
        entity.ConnectionName = dto.ConnectionName;
        entity.QueryTemplate = dto.QueryTemplate;
        entity.ParametersJson = dto.ParametersJson;
        entity.Engine = (DbEngine)dto.Engine;

        await _db.SaveChangesAsync(ct);
        return MapToDto(entity);
    }

    public async Task DeleteQueryAsync(Guid id, CancellationToken ct = default)
    {
        var entity = await _db.IntegrationQueries.FirstOrDefaultAsync(q => q.Id == id, ct);
        if (entity == null) throw new BusinessException("Query not found");

        _db.IntegrationQueries.Remove(entity);
        await _db.SaveChangesAsync(ct);
    }

    private static IntegrationQueryDto MapToDto(IntegrationQueryEntity entity)
    {
        return new IntegrationQueryDto
        {
            Id = entity.Id,
            Name = entity.Name,
            ConnectionName = entity.ConnectionName,
            QueryTemplate = entity.QueryTemplate,
            ParametersJson = entity.ParametersJson,
            Engine = (int)entity.Engine
        };
    }
}
