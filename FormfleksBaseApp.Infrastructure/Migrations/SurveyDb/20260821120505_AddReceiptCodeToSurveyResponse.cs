using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.SurveyDb
{
    /// <inheritdoc />
    public partial class AddReceiptCodeToSurveyResponse : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "ReceiptCode",
                table: "survey_responses",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EmailDeliveryStatus",
                table: "survey_assignments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<string>(
                name: "EmailErrorMessage",
                table: "survey_assignments",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "EmailRetryCount",
                table: "survey_assignments",
                type: "integer",
                nullable: false,
                defaultValue: 0);

            migrationBuilder.AddColumn<DateTime>(
                name: "LastEmailAttemptAt",
                table: "survey_assignments",
                type: "timestamp with time zone",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "ReceiptCode",
                table: "survey_responses");

            migrationBuilder.DropColumn(
                name: "EmailDeliveryStatus",
                table: "survey_assignments");

            migrationBuilder.DropColumn(
                name: "EmailErrorMessage",
                table: "survey_assignments");

            migrationBuilder.DropColumn(
                name: "EmailRetryCount",
                table: "survey_assignments");

            migrationBuilder.DropColumn(
                name: "LastEmailAttemptAt",
                table: "survey_assignments");
        }
    }
}
