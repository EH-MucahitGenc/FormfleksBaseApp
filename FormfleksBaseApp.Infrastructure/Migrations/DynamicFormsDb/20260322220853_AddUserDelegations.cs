using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.DynamicFormsDb
{
    /// <inheritdoc />
    public partial class AddUserDelegations : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "user_delegations",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    delegator_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    delegatee_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    start_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    reason = table.Column<string>(type: "character varying(300)", maxLength: 300, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_delegations", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_user_delegations_delegator_user_id",
                table: "user_delegations",
                column: "delegator_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_user_delegations_delegator_user_id_is_active",
                table: "user_delegations",
                columns: new[] { "delegator_user_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_user_delegations_start_date_end_date",
                table: "user_delegations",
                columns: new[] { "start_date", "end_date" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "user_delegations");
        }
    }
}
