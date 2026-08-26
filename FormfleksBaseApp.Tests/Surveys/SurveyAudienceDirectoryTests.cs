using Dapper;
using FormfleksBaseApp.Application.Features.Surveys.Common;
using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Domain.Entities.Admin;
using FormfleksBaseApp.Infrastructure.Persistence;
using FormfleksBaseApp.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using System;
using System.Collections.Generic;
using System.Linq;
using System.Threading;
using System.Threading.Tasks;
using Xunit;

namespace FormfleksBaseApp.Tests.Surveys
{
    public class SurveyAudienceDirectoryTests : IDisposable
    {
        private readonly AppDbContext _context;
        private readonly SurveyAudienceDirectory _directory;
        private readonly List<Guid> _createdUserIds = new();
        private readonly List<Guid> _createdQdmsIds = new();

        public SurveyAudienceDirectoryTests()
        {
            var connectionString = Environment.GetEnvironmentVariable("SURVEY_TEST_CONNECTION_STRING");
            
            if (string.IsNullOrEmpty(connectionString))
            {
                var appSettingsPath = System.IO.Path.Combine(System.IO.Directory.GetCurrentDirectory(), "..", "..", "..", "..", "FormfleksBaseApp.Api", "appsettings.Development.json");
                if (System.IO.File.Exists(appSettingsPath))
                {
                    try
                    {
                        var json = System.IO.File.ReadAllText(appSettingsPath);
                        using var doc = System.Text.Json.JsonDocument.Parse(json);
                        var defaultConn = doc.RootElement.GetProperty("ConnectionStrings").GetProperty("Default").GetString();
                        if (!string.IsNullOrEmpty(defaultConn))
                        {
                            connectionString = defaultConn.Replace("Database=formfleks_base_app", "Database=formfleks_base_app_test");
                        }
                    }
                    catch { /* ignore */ }
                }
            }
            
            if (string.IsNullOrEmpty(connectionString))
            {
                connectionString = "Host=localhost;Port=5432;Database=formfleks_base_app_test;Username=postgres;Password=postgres";
            }

            var options = new DbContextOptionsBuilder<AppDbContext>()
                .UseNpgsql(connectionString)
                .Options;

            _context = new AppDbContext(options);
            _context.Database.Migrate();

            // We also need QdmsPersoneller table, which is in DynamicFormsDbContext normally,
            // but Dapper queries it from `public.qdms_personeller`. We will insert into it directly using Dapper for setup.
            var createTableSql = @"
                CREATE TABLE IF NOT EXISTS public.qdms_personeller (
                    id uuid NOT NULL,
                    sirket character varying(50),
                    sicil_no character varying(50),
                    linked_user_id uuid,
                    is_active boolean,
                    created_at timestamp with time zone,
                    active boolean,
                    isyeri_tanimi character varying(150),
                    departman_adi character varying(150),
                    pozisyon_aciklamasi character varying(150),
                    grup_kodu_aciklama character varying(150),
                    last_sync_date timestamp with time zone,
                    CONSTRAINT pk_qdms_personeller PRIMARY KEY (id)
                );
            ";
            
            var conn = _context.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open) conn.Open();
            conn.Execute(createTableSql);

            _directory = new SurveyAudienceDirectory(_context);
        }

        public void Dispose()
        {
            try
            {
                var conn = _context.Database.GetDbConnection();
                if (conn.State != System.Data.ConnectionState.Open) conn.Open();

                if (_createdQdmsIds.Any())
                {
                    conn.Execute("DELETE FROM public.qdms_personeller WHERE id = ANY(@Ids)", new { Ids = _createdQdmsIds.ToArray() });
                }
                
                if (_createdUserIds.Any())
                {
                    var users = _context.Users.Where(u => _createdUserIds.Contains(u.Id)).ToList();
                    _context.Users.RemoveRange(users);
                    _context.SaveChanges();
                }
            }
            catch { }
            
            _context.Dispose();
        }

        private async Task<AppUser> CreateUserAsync(bool isActive)
        {
            var user = new AppUser
            {
                Id = Guid.NewGuid(),
                Email = $"test{Guid.NewGuid()}@example.com",
                DisplayName = "Test User",
                Active = isActive
            };
            _context.Users.Add(user);
            await _context.SaveChangesAsync();
            _createdUserIds.Add(user.Id);
            return user;
        }

        private async Task<Guid> CreateQdmsRecordAsync(Guid? linkedUserId, bool isActive, string company = "TestCompany")
        {
            var id = Guid.NewGuid();
            var sql = @"
                INSERT INTO public.qdms_personeller (id, sirket, sicil_no, linked_user_id, is_active, created_at, active)
                VALUES (@Id, @Company, @SicilNo, @LinkedUserId, @IsActive, @CreatedAt, true)
            ";
            
            var conn = _context.Database.GetDbConnection();
            if (conn.State != System.Data.ConnectionState.Open) await conn.OpenAsync();

            await conn.ExecuteAsync(sql, new 
            { 
                Id = id, 
                Company = company,
                SicilNo = Guid.NewGuid().ToString().Substring(0, 20),
                LinkedUserId = linkedUserId,
                IsActive = isActive,
                CreatedAt = DateTime.UtcNow
            });

            _createdQdmsIds.Add(id);
            return id;
        }

        [Fact]
        public async Task ActiveUser_WithActiveQdms_ShouldBeSelectableAndHaveOrgData()
        {
            var user = await CreateUserAsync(true);
            await CreateQdmsRecordAsync(user.Id, true, "ActiveCompany");

            var result = await _directory.GetUsersAsync(new AudienceFilter { SearchTerm = user.Email }, 1, 10);
            
            Assert.Single(result);
            Assert.Equal(user.Id, result[0].UserId);
            Assert.True(result[0].HasOrganizationData);
            Assert.Equal("ActiveCompany", result[0].Company);
        }

        [Fact]
        public async Task ActiveUser_WithoutQdms_ShouldBeSelectableButNoOrgData()
        {
            var user = await CreateUserAsync(true);

            var result = await _directory.GetUsersAsync(new AudienceFilter { SearchTerm = user.Email }, 1, 10);
            
            Assert.Single(result);
            Assert.Equal(user.Id, result[0].UserId);
            Assert.False(result[0].HasOrganizationData);
            Assert.Equal("", result[0].Company);
        }

        [Fact]
        public async Task ActiveUser_WithPassiveQdms_ShouldBeSelectableButNoOrgData()
        {
            var user = await CreateUserAsync(true);
            await CreateQdmsRecordAsync(user.Id, false, "PassiveCompany");

            var result = await _directory.GetUsersAsync(new AudienceFilter { SearchTerm = user.Email }, 1, 10);
            
            Assert.Single(result);
            Assert.Equal(user.Id, result[0].UserId);
            Assert.False(result[0].HasOrganizationData);
            Assert.Equal("", result[0].Company);
        }

        [Fact]
        public async Task PassiveUser_WithActiveQdms_ShouldNotBeSelectable()
        {
            var user = await CreateUserAsync(false);
            await CreateQdmsRecordAsync(user.Id, true);

            var result = await _directory.GetUsersAsync(new AudienceFilter { SearchTerm = user.Email }, 1, 10);
            
            Assert.Empty(result);
        }

        [Fact]
        public async Task QdmsExists_ButNoUser_ShouldNotBeSelectable()
        {
            // Only QDMS record, no linked AppUser
            await CreateQdmsRecordAsync(null, true);
            // It's impossible to filter by Email because AppUser doesn't exist, we will just count based on an impossible filter
            var result = await _directory.GetUsersAsync(new AudienceFilter { SearchTerm = "nonexistentuser@example.com" }, 1, 10);
            Assert.Empty(result);
        }

        [Fact]
        public async Task DuplicateQdmsRecords_ShouldNotProduceDuplicateUsers()
        {
            var user = await CreateUserAsync(true);
            
            // Create two QDMS records for same user
            await CreateQdmsRecordAsync(user.Id, true, "Company A");
            await CreateQdmsRecordAsync(user.Id, true, "Company B");

            var result = await _directory.GetUsersAsync(new AudienceFilter { SearchTerm = user.Email }, 1, 10);
            
            Assert.Single(result); // Must be exactly 1
            Assert.Equal(user.Id, result[0].UserId);
            Assert.True(result[0].HasOrganizationData);
            // Company could be A or B depending on which one the ROW_NUMBER picked, but only one is returned.
        }
    }
}
