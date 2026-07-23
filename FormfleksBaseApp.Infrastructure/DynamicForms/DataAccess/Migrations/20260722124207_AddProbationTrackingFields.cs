using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddProbationTrackingFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "Baslama_Tarihi",
                schema: "public",
                table: "qdms_personeller",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deneme2Ay_Trh",
                schema: "public",
                table: "qdms_personeller",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Deneme6Ay_Trh",
                schema: "public",
                table: "qdms_personeller",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<DateTime>(
                name: "Dogum_Tarihi",
                schema: "public",
                table: "qdms_personeller",
                type: "timestamp with time zone",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "SystemUsageType",
                schema: "public",
                table: "form_types",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "Baslama_Tarihi",
                schema: "public",
                table: "qdms_personeller");

            migrationBuilder.DropColumn(
                name: "Deneme2Ay_Trh",
                schema: "public",
                table: "qdms_personeller");

            migrationBuilder.DropColumn(
                name: "Deneme6Ay_Trh",
                schema: "public",
                table: "qdms_personeller");

            migrationBuilder.DropColumn(
                name: "Dogum_Tarihi",
                schema: "public",
                table: "qdms_personeller");

            migrationBuilder.DropColumn(
                name: "SystemUsageType",
                schema: "public",
                table: "form_types");
        }
    }
}
