using FormfleksBaseApp.Infrastructure.Surveys.DataAccess;
using Microsoft.EntityFrameworkCore.Infrastructure;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.SurveyDb;

[DbContext(typeof(SurveyDbContext))]
[Migration("20260826114816_AddSurveyReportingSnapshots")]
public partial class AddSurveyReportingSnapshots : Migration
{
    protected override void Up(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_survey_responses_survey_campaign_id", table: "survey_responses");
        migrationBuilder.DropIndex(name: "IX_survey_answers_survey_version_question_id", table: "survey_answers");

        migrationBuilder.AddColumn<string>(name: "company_snapshot", table: "survey_assignments", type: "character varying(250)", maxLength: 250, nullable: true);
        migrationBuilder.AddColumn<string>(name: "department_snapshot", table: "survey_assignments", type: "character varying(250)", maxLength: 250, nullable: true);
        migrationBuilder.AddColumn<string>(name: "job_title_snapshot", table: "survey_assignments", type: "character varying(250)", maxLength: 250, nullable: true);
        migrationBuilder.AddColumn<string>(name: "location_snapshot", table: "survey_assignments", type: "character varying(250)", maxLength: 250, nullable: true);
        migrationBuilder.AddColumn<string>(name: "participant_display_name", table: "survey_assignments", type: "character varying(200)", maxLength: 200, nullable: false, defaultValue: "");
        migrationBuilder.AddColumn<string>(name: "participant_email", table: "survey_assignments", type: "character varying(320)", maxLength: 320, nullable: false, defaultValue: "");
        migrationBuilder.AddColumn<string>(name: "personnel_group_snapshot", table: "survey_assignments", type: "character varying(250)", maxLength: 250, nullable: true);
        migrationBuilder.AddColumn<DateTime>(name: "snapshot_at", table: "survey_assignments", type: "timestamp with time zone", nullable: true);
        migrationBuilder.AddColumn<string>(name: "snapshot_source", table: "survey_assignments", type: "character varying(50)", maxLength: 50, nullable: false, defaultValue: "LegacyCurrentFallback");
        migrationBuilder.AddColumn<DateTime>(name: "started_at", table: "survey_assignments", type: "timestamp with time zone", nullable: true);

        migrationBuilder.Sql("UPDATE survey_assignments SET snapshot_at = created_at WHERE snapshot_at IS NULL");
        migrationBuilder.AlterColumn<DateTime>(name: "snapshot_at", table: "survey_assignments", type: "timestamp with time zone", nullable: false,
            defaultValueSql: "CURRENT_TIMESTAMP", oldClrType: typeof(DateTime), oldType: "timestamp with time zone", oldNullable: true);

        migrationBuilder.CreateIndex(name: "IX_survey_responses_survey_campaign_id_submitted_at", table: "survey_responses", columns: new[] { "survey_campaign_id", "submitted_at" });
        migrationBuilder.CreateIndex(name: "IX_survey_responses_survey_campaign_id_user_id", table: "survey_responses", columns: new[] { "survey_campaign_id", "user_id" });
        migrationBuilder.CreateIndex(name: "IX_survey_assignments_survey_campaign_id_department_snapshot", table: "survey_assignments", columns: new[] { "survey_campaign_id", "department_snapshot" });
        migrationBuilder.CreateIndex(name: "IX_survey_assignments_survey_campaign_id_location_snapshot", table: "survey_assignments", columns: new[] { "survey_campaign_id", "location_snapshot" });
        migrationBuilder.CreateIndex(name: "IX_survey_assignments_survey_campaign_id_status", table: "survey_assignments", columns: new[] { "survey_campaign_id", "status" });
        migrationBuilder.CreateIndex(name: "IX_survey_answers_survey_version_question_id_survey_response_id", table: "survey_answers", columns: new[] { "survey_version_question_id", "survey_response_id" });
    }

    protected override void Down(MigrationBuilder migrationBuilder)
    {
        migrationBuilder.DropIndex(name: "IX_survey_responses_survey_campaign_id_submitted_at", table: "survey_responses");
        migrationBuilder.DropIndex(name: "IX_survey_responses_survey_campaign_id_user_id", table: "survey_responses");
        migrationBuilder.DropIndex(name: "IX_survey_assignments_survey_campaign_id_department_snapshot", table: "survey_assignments");
        migrationBuilder.DropIndex(name: "IX_survey_assignments_survey_campaign_id_location_snapshot", table: "survey_assignments");
        migrationBuilder.DropIndex(name: "IX_survey_assignments_survey_campaign_id_status", table: "survey_assignments");
        migrationBuilder.DropIndex(name: "IX_survey_answers_survey_version_question_id_survey_response_id", table: "survey_answers");

        migrationBuilder.DropColumn(name: "company_snapshot", table: "survey_assignments");
        migrationBuilder.DropColumn(name: "department_snapshot", table: "survey_assignments");
        migrationBuilder.DropColumn(name: "job_title_snapshot", table: "survey_assignments");
        migrationBuilder.DropColumn(name: "location_snapshot", table: "survey_assignments");
        migrationBuilder.DropColumn(name: "participant_display_name", table: "survey_assignments");
        migrationBuilder.DropColumn(name: "participant_email", table: "survey_assignments");
        migrationBuilder.DropColumn(name: "personnel_group_snapshot", table: "survey_assignments");
        migrationBuilder.DropColumn(name: "snapshot_at", table: "survey_assignments");
        migrationBuilder.DropColumn(name: "snapshot_source", table: "survey_assignments");
        migrationBuilder.DropColumn(name: "started_at", table: "survey_assignments");

        migrationBuilder.CreateIndex(name: "IX_survey_responses_survey_campaign_id", table: "survey_responses", column: "survey_campaign_id");
        migrationBuilder.CreateIndex(name: "IX_survey_answers_survey_version_question_id", table: "survey_answers", column: "survey_version_question_id");
    }
}
