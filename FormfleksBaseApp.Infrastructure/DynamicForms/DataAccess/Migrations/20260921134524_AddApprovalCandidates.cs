using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddApprovalCandidates : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "form_request_approval_candidates",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    approval_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_form_request_approval_candidates", x => x.id);
                    table.ForeignKey(
                        name: "FK_form_request_approval_candidates_form_request_approvals_app~",
                        column: x => x.approval_id,
                        principalSchema: "public",
                        principalTable: "form_request_approvals",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_form_request_approval_candidates_approval_id_user_id",
                schema: "public",
                table: "form_request_approval_candidates",
                columns: new[] { "approval_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_form_request_approval_candidates_user_id_approval_id",
                schema: "public",
                table: "form_request_approval_candidates",
                columns: new[] { "user_id", "approval_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "form_request_approval_candidates",
                schema: "public");
        }
    }
}
