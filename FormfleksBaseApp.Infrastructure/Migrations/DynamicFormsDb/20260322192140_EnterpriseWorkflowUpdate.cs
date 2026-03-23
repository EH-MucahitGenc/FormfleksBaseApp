using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.DynamicFormsDb
{
    /// <inheritdoc />
    public partial class EnterpriseWorkflowUpdate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<short>(
                name: "fallback_action",
                table: "workflow_steps",
                type: "smallint",
                nullable: false,
                defaultValue: (short)0);

            migrationBuilder.AddColumn<Guid>(
                name: "fallback_user_id",
                table: "workflow_steps",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<bool>(
                name: "is_parallel",
                table: "workflow_steps",
                type: "boolean",
                nullable: false,
                defaultValue: false);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "fallback_action",
                table: "workflow_steps");

            migrationBuilder.DropColumn(
                name: "fallback_user_id",
                table: "workflow_steps");

            migrationBuilder.DropColumn(
                name: "is_parallel",
                table: "workflow_steps");
        }
    }
}
