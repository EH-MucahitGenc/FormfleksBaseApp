using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.DynamicFormsDb
{
    /// <inheritdoc />
    public partial class AddFormRequestManualAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "form_request_manual_assignments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    form_request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    step_no = table.Column<int>(type: "integer", nullable: false),
                    assignee_user_id = table.Column<Guid>(type: "uuid", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_form_request_manual_assignments", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_form_request_manual_assignments_form_request_id_step_no",
                table: "form_request_manual_assignments",
                columns: new[] { "form_request_id", "step_no" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "form_request_manual_assignments");
        }
    }
}
