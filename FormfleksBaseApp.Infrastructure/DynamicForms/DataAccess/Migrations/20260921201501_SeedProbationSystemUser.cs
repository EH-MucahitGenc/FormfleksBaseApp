using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class SeedProbationSystemUser : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql(
                """
                INSERT INTO public.users
                    (id, email, auth_provider, display_name, created_at, active)
                VALUES
                    ('00000000-0000-0000-0000-000000000001',
                     'system-probation-000000000001@formfleks.invalid',
                     'System',
                     'Formfleks Sistem Kullanicisi',
                     CURRENT_TIMESTAMP,
                     FALSE)
                ON CONFLICT DO NOTHING;
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            // The principal may be referenced by existing form requests. Keeping it
            // during rollback prevents foreign-key violations and data loss.
        }
    }
}
