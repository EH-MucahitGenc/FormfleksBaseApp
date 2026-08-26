using Dapper;
using FormfleksBaseApp.Application.Features.Surveys.Common;
using FormfleksBaseApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Text;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Infrastructure.Services;

public class SurveyAudienceDirectory : ISurveyAudienceDirectory
{
    private readonly AppDbContext _dbContext;

    public SurveyAudienceDirectory(AppDbContext dbContext)
    {
        _dbContext = dbContext;
    }


    private string WrapWithIncludesExcludes(string filterConditionsSql, AudienceFilter filter, DynamicParameters parameters)
    {
        var sb = new StringBuilder();

        // Check if there are ANY base filters (if filterConditionsSql is empty, no base filter applied)
        bool hasBaseFilters = !string.IsNullOrWhiteSpace(filterConditionsSql);

        sb.Append(" AND ( ");

        if (hasBaseFilters)
        {
            sb.Append(" (1=1 " + filterConditionsSql + ") ");
        }
        else
        {
            // If no base filters, the default is to include NO ONE if IncludedUserIds is used as a specific selection.
            // But wait, if someone opens the modal without filters, they see everyone.
            // Let's assume if no filters, it returns everyone. 
            sb.Append(" 1=1 "); 
        }

        if (filter.IncludedUserIds != null && filter.IncludedUserIds.Any())
        {
            sb.Append(" OR u.id = ANY(@IncludedUserIds) ");
            parameters.Add("IncludedUserIds", filter.IncludedUserIds.ToArray());
        }
        sb.Append(" ) ");

        if (filter.ExcludedUserIds != null && filter.ExcludedUserIds.Any())
        {
            sb.Append(" AND u.id != ALL(@ExcludedUserIds) ");
            parameters.Add("ExcludedUserIds", filter.ExcludedUserIds.ToArray());
        }

        return sb.ToString();
    }
    
    private (string Sql, DynamicParameters Parameters) GetFullQuery(AudienceFilter filter, bool isCount)
    {
        var parameters = new DynamicParameters();
        
        var sb = new StringBuilder();
        if (isCount)
        {
            sb.Append("SELECT COUNT(*) ");
        }
        else
        {
            sb.Append(@"
                SELECT 
                    u.id as UserId, 
                    COALESCE(u.display_name, '') as DisplayName, 
                    u.email as Email, 
                    COALESCE(q.sirket, '') as Company, 
                    COALESCE(q.isyeri_tanimi, '') as Location, 
                    COALESCE(q.departman_adi, '') as Department, 
                    COALESCE(q.pozisyon_aciklamasi, '') as Title, 
                    COALESCE(q.grup_kodu_aciklama, '') as PersonnelGroup,
                    CASE WHEN q.id IS NOT NULL THEN true ELSE false END as HasOrganizationData,
                    (
                        SELECT string_agg(r.name, ',') 
                        FROM public.user_roles ur 
                        JOIN public.roles r ON ur.role_id = r.id 
                        WHERE ur.user_id = u.id
                    ) as RolesString
            ");
        }

        sb.Append(@"
            FROM public.users u
            LEFT JOIN (
                SELECT * FROM (
                    SELECT *, ROW_NUMBER() OVER(PARTITION BY linked_user_id ORDER BY last_sync_date DESC, id) as rn
                    FROM public.qdms_personeller
                    WHERE is_active = true AND linked_user_id IS NOT NULL
                ) q_inner WHERE rn = 1
            ) q ON u.id = q.linked_user_id
            WHERE u.active = true
        ");

        var filterSb = new StringBuilder();

        if (!string.IsNullOrWhiteSpace(filter.SearchTerm))
        {
            filterSb.Append(" AND (u.display_name ILIKE @SearchTerm OR u.email ILIKE @SearchTerm) ");
            parameters.Add("SearchTerm", $"%{filter.SearchTerm}%");
        }

        if (filter.Companies != null && filter.Companies.Any())
        {
            filterSb.Append(" AND q.sirket = ANY(@Companies) ");
            parameters.Add("Companies", filter.Companies.ToArray());
        }

        if (filter.Locations != null && filter.Locations.Any())
        {
            filterSb.Append(" AND q.isyeri_tanimi = ANY(@Locations) ");
            parameters.Add("Locations", filter.Locations.ToArray());
        }

        if (filter.Departments != null && filter.Departments.Any())
        {
            filterSb.Append(" AND q.departman_adi = ANY(@Departments) ");
            parameters.Add("Departments", filter.Departments.ToArray());
        }

        if (filter.Titles != null && filter.Titles.Any())
        {
            filterSb.Append(" AND q.pozisyon_aciklamasi = ANY(@Titles) ");
            parameters.Add("Titles", filter.Titles.ToArray());
        }

        if (filter.PersonnelGroups != null && filter.PersonnelGroups.Any())
        {
            filterSb.Append(" AND q.grup_kodu_aciklama = ANY(@PersonnelGroups) ");
            parameters.Add("PersonnelGroups", filter.PersonnelGroups.ToArray());
        }

        if (filter.Roles != null && filter.Roles.Any())
        {
            filterSb.Append(@" AND EXISTS (
                SELECT 1 FROM ""UserRoles"" ur2 
                JOIN ""Roles"" r2 ON ur2.role_id = r2.id 
                WHERE ur2.user_id = u.id AND r2.name = ANY(@Roles)
            ) ");
            parameters.Add("Roles", filter.Roles.ToArray());
        }

        if (filter.HasOrganizationData.HasValue)
        {
            if (filter.HasOrganizationData.Value)
            {
                filterSb.Append(" AND q.id IS NOT NULL ");
            }
            else
            {
                filterSb.Append(" AND q.id IS NULL ");
            }
        }

        sb.Append(WrapWithIncludesExcludes(filterSb.ToString(), filter, parameters));

        return (sb.ToString(), parameters);
    }

    public async Task<int> GetTotalUsersCountAsync(AudienceFilter filter, CancellationToken cancellationToken = default)
    {
        var (sql, parameters) = GetFullQuery(filter, true);
        var connection = _dbContext.Database.GetDbConnection();
        return await connection.ExecuteScalarAsync<int>(sql, parameters);
    }

    public async Task<List<SurveyAudienceUser>> GetUsersAsync(AudienceFilter filter, int page, int pageSize, CancellationToken cancellationToken = default)
    {
        var (sql, parameters) = GetFullQuery(filter, false);
        
        sql += " ORDER BY COALESCE(u.display_name, ''), u.id LIMIT @Limit OFFSET @Offset ";
        parameters.Add("Limit", pageSize);
        parameters.Add("Offset", (page - 1) * pageSize);

        var connection = _dbContext.Database.GetDbConnection();
        var result = await connection.QueryAsync(sql, parameters);

        return result.Select(row => new SurveyAudienceUser
        {
            UserId = row.userid,
            DisplayName = row.displayname,
            Email = row.email,
            Company = row.company,
            Location = row.location,
            Department = row.department,
            Title = row.title,
            PersonnelGroup = row.personnelgroup,
            HasOrganizationData = row.hasorganizationdata,
            Roles = string.IsNullOrEmpty((string)row.rolesstring) ? new List<string>() : ((string)row.rolesstring).Split(',').ToList()
        }).ToList();
    }

    public async Task<List<SurveyAudienceUser>> GetUsersByIdsAsync(IEnumerable<Guid> userIds, CancellationToken cancellationToken = default)
    {
        var ids = userIds.ToList();
        if (!ids.Any()) return new List<SurveyAudienceUser>();

        var filter = new AudienceFilter { IncludedUserIds = ids, ExcludedUserIds = new List<Guid>() };
        // We only want these specific users, no matter the other filters (which are null anyway)
        // Since the base filter is 1=1 AND nothing, it would normally return everyone OR Included. 
        // We want ONLY Included. Let's make a specific query for by Ids.
        
        var sql = @"
            SELECT 
                u.id as UserId, 
                COALESCE(u.display_name, '') as DisplayName, 
                u.email as Email, 
                COALESCE(q.sirket, '') as Company, 
                COALESCE(q.isyeri_tanimi, '') as Location, 
                COALESCE(q.departman_adi, '') as Department, 
                COALESCE(q.pozisyon_aciklamasi, '') as Title, 
                COALESCE(q.grup_kodu_aciklama, '') as PersonnelGroup,
                CASE WHEN q.id IS NOT NULL THEN true ELSE false END as HasOrganizationData,
                (
                    SELECT string_agg(r.name, ',') 
                    FROM public.user_roles ur 
                    JOIN public.roles r ON ur.role_id = r.id 
                    WHERE ur.user_id = u.id
                ) as RolesString
            FROM public.users u
            LEFT JOIN (
                SELECT * FROM (
                    SELECT *, ROW_NUMBER() OVER(PARTITION BY linked_user_id ORDER BY last_sync_date DESC, id) as rn
                    FROM public.qdms_personeller
                    WHERE is_active = true AND linked_user_id IS NOT NULL
                ) q_inner WHERE rn = 1
            ) q ON u.id = q.linked_user_id
            WHERE u.active = true AND u.id = ANY(@Ids)
        ";

        var connection = _dbContext.Database.GetDbConnection();
        var result = await connection.QueryAsync(sql, new { Ids = ids.ToArray() });

        return result.Select(row => new SurveyAudienceUser
        {
            UserId = row.userid,
            DisplayName = row.displayname,
            Email = row.email,
            Company = row.company,
            Location = row.location,
            Department = row.department,
            Title = row.title,
            PersonnelGroup = row.personnelgroup,
            HasOrganizationData = row.hasorganizationdata,
            Roles = string.IsNullOrEmpty((string)row.rolesstring) ? new List<string>() : ((string)row.rolesstring).Split(',').ToList()
        }).ToList();
    }

    public async Task<AudienceFacets> GetFacetsAsync(CancellationToken cancellationToken = default)
    {
        var sql = @"
            SELECT 
                array_remove(array_agg(DISTINCT q.sirket), NULL) as Companies,
                array_remove(array_agg(DISTINCT q.isyeri_tanimi), NULL) as Locations,
                array_remove(array_agg(DISTINCT q.departman_adi), NULL) as Departments,
                array_remove(array_agg(DISTINCT q.pozisyon_aciklamasi), NULL) as Titles,
                array_remove(array_agg(DISTINCT q.grup_kodu_aciklama), NULL) as PersonnelGroups
            FROM public.users u
            JOIN public.qdms_personeller q ON u.id = q.linked_user_id AND q.is_active = true
            WHERE u.active = true;
        ";

        var rolesSql = @"
            SELECT DISTINCT r.name
            FROM public.users u
            JOIN public.user_roles ur ON u.id = ur.user_id
            JOIN public.roles r ON ur.role_id = r.id
            WHERE u.active = true;
        ";

        var connection = _dbContext.Database.GetDbConnection();
        var facetsRow = await connection.QueryFirstOrDefaultAsync(sql);
        var roles = await connection.QueryAsync<string>(rolesSql);

        return new AudienceFacets
        {
            Companies = facetsRow?.companies != null ? ((string[])facetsRow.companies).Where(x => !string.IsNullOrWhiteSpace(x)).ToList() : new List<string>(),
            Locations = facetsRow?.locations != null ? ((string[])facetsRow.locations).Where(x => !string.IsNullOrWhiteSpace(x)).ToList() : new List<string>(),
            Departments = facetsRow?.departments != null ? ((string[])facetsRow.departments).Where(x => !string.IsNullOrWhiteSpace(x)).ToList() : new List<string>(),
            Titles = facetsRow?.titles != null ? ((string[])facetsRow.titles).Where(x => !string.IsNullOrWhiteSpace(x)).ToList() : new List<string>(),
            PersonnelGroups = facetsRow?.personnelgroups != null ? ((string[])facetsRow.personnelgroups).Where(x => !string.IsNullOrWhiteSpace(x)).ToList() : new List<string>(),
            Roles = roles.ToList()
        };
    }
}
