using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.DynamicFormsDb
{
    /// <inheritdoc />
    public partial class UserLocationRoles : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "hr_authorizations");

            migrationBuilder.AddColumn<Guid>(
                name: "TargetLocationRoleId",
                table: "workflow_steps",
                type: "uuid",
                nullable: true);

            migrationBuilder.CreateTable(
                name: "user_location_roles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_id = table.Column<Guid>(type: "uuid", nullable: false),
                    location_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    is_global_manager = table.Column<bool>(type: "boolean", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_location_roles", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_user_location_roles_location_name",
                table: "user_location_roles",
                column: "location_name");

            migrationBuilder.CreateIndex(
                name: "IX_user_location_roles_user_id_role_id",
                table: "user_location_roles",
                columns: new[] { "user_id", "role_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_location_roles");

            migrationBuilder.DropColumn(
                name: "TargetLocationRoleId",
                table: "workflow_steps");

            migrationBuilder.CreateTable(
                name: "hr_authorizations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    active = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_global_manager = table.Column<bool>(type: "boolean", nullable: false),
                    location_name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false)
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
    }
}
