using FormfleksBaseApp.Infrastructure.Surveys.DataAccess;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.SurveyDb;

[DbContext(typeof(SurveyDbContext))]
[Migration("20260921150000_NormalizeSurveyCampaignOwnershipNullability")]
public partial class NormalizeSurveyCampaignOwnershipNullability : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.AlterColumn<Guid>(
            name: "owner_user_id",
            table: "survey_campaigns",
            type: "uuid",
            nullable: true,
            oldClrType: typeof(Guid),
            oldType: "uuid",
            oldDefaultValue: Guid.Empty);

        migrationBuilder.AlterColumn<Guid>(
            name: "created_by_user_id",
            table: "survey_campaigns",
            type: "uuid",
            nullable: true,
            oldClrType: typeof(Guid),
            oldType: "uuid",
            oldDefaultValue: Guid.Empty);
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.Sql(
            "UPDATE survey_campaigns SET owner_user_id = '00000000-0000-0000-0000-000000000000' WHERE owner_user_id IS NULL");
        migrationBuilder.Sql(
            "UPDATE survey_campaigns SET created_by_user_id = '00000000-0000-0000-0000-000000000000' WHERE created_by_user_id IS NULL");

        migrationBuilder.AlterColumn<Guid>(
            name: "owner_user_id",
            table: "survey_campaigns",
            type: "uuid",
            nullable: false,
            defaultValue: Guid.Empty,
            oldClrType: typeof(Guid),
            oldType: "uuid",
            oldNullable: true);

        migrationBuilder.AlterColumn<Guid>(
            name: "created_by_user_id",
            table: "survey_campaigns",
            type: "uuid",
            nullable: false,
            defaultValue: Guid.Empty,
            oldClrType: typeof(Guid),
            oldType: "uuid",
            oldNullable: true);
    }
}
