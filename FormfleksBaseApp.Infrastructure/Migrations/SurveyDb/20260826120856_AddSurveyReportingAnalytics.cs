using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.SurveyDb
{
    /// <inheritdoc />
    public partial class AddSurveyReportingAnalytics : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "company_snapshot",
                table: "survey_responses",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "department_snapshot",
                table: "survey_responses",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "job_title_snapshot",
                table: "survey_responses",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "location_snapshot",
                table: "survey_responses",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "personnel_group_snapshot",
                table: "survey_responses",
                type: "character varying(250)",
                maxLength: 250,
                nullable: true);

            migrationBuilder.CreateIndex(
                name: "IX_survey_responses_survey_campaign_id_department_snapshot",
                table: "survey_responses",
                columns: new[] { "survey_campaign_id", "department_snapshot" });

            migrationBuilder.CreateIndex(
                name: "IX_survey_responses_survey_campaign_id_location_snapshot",
                table: "survey_responses",
                columns: new[] { "survey_campaign_id", "location_snapshot" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropIndex(
                name: "IX_survey_responses_survey_campaign_id_department_snapshot",
                table: "survey_responses");

            migrationBuilder.DropIndex(
                name: "IX_survey_responses_survey_campaign_id_location_snapshot",
                table: "survey_responses");

            migrationBuilder.DropColumn(
                name: "company_snapshot",
                table: "survey_responses");

            migrationBuilder.DropColumn(
                name: "department_snapshot",
                table: "survey_responses");

            migrationBuilder.DropColumn(
                name: "job_title_snapshot",
                table: "survey_responses");

            migrationBuilder.DropColumn(
                name: "location_snapshot",
                table: "survey_responses");

            migrationBuilder.DropColumn(
                name: "personnel_group_snapshot",
                table: "survey_responses");
        }
    }
}
