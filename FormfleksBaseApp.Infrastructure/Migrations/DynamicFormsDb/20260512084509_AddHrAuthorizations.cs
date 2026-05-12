using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.DynamicFormsDb
{
    /// <inheritdoc />
    public partial class AddHrAuthorizations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "hr_authorizations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_global_manager = table.Column<bool>(type: "boolean", nullable: false),
                    location_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_hr_authorizations", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_hr_authorizations_is_global_manager",
                table: "hr_authorizations",
                column: "is_global_manager");

            migrationBuilder.CreateIndex(
                name: "IX_hr_authorizations_location_name_active",
                table: "hr_authorizations",
                columns: new[] { "location_name", "active" });

            migrationBuilder.CreateIndex(
                name: "IX_hr_authorizations_user_id_active",
                table: "hr_authorizations",
                columns: new[] { "user_id", "active" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "hr_authorizations");
        }
    }
}
