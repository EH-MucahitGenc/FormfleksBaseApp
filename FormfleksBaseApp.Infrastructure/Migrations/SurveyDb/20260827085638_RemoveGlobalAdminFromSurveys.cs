using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Persistence.Migrations.SurveyDb
{
    /// <inheritdoc />
    public partial class RemoveGlobalAdminFromSurveys : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<DateTime>(
                name: "granted_at",
                table: "survey_result_viewers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "granted_by_user_id",
                table: "survey_result_viewers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "revoked_at",
                table: "survey_result_viewers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "revoked_by_user_id",
                table: "survey_result_viewers",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "valid_from",
                table: "survey_result_viewers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "valid_until",
                table: "survey_result_viewers",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "business_owner_user_id",
                table: "survey_campaigns",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "created_by_user_id",
                table: "survey_campaigns",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<Guid>(
                name: "owner_user_id",
                table: "survey_campaigns",
                type: "uuid",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "granted_at",
                table: "survey_result_viewers");

            migrationBuilder.DropColumn(
                name: "granted_by_user_id",
                table: "survey_result_viewers");

            migrationBuilder.DropColumn(
                name: "revoked_at",
                table: "survey_result_viewers");

            migrationBuilder.DropColumn(
                name: "revoked_by_user_id",
                table: "survey_result_viewers");

            migrationBuilder.DropColumn(
                name: "valid_from",
                table: "survey_result_viewers");

            migrationBuilder.DropColumn(
                name: "valid_until",
                table: "survey_result_viewers");

            migrationBuilder.DropColumn(
                name: "business_owner_user_id",
                table: "survey_campaigns");

            migrationBuilder.DropColumn(
                name: "created_by_user_id",
                table: "survey_campaigns");

            migrationBuilder.DropColumn(
                name: "owner_user_id",
                table: "survey_campaigns");
        }
    }
}
