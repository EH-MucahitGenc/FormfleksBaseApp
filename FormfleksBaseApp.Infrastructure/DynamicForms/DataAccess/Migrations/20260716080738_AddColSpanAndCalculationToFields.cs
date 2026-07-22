using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddColSpanAndCalculationToFields : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.EnsureSchema(
                name: "public");

            migrationBuilder.RenameTable(
                name: "workflow_steps",
                newName: "workflow_steps",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "workflow_definitions",
                newName: "workflow_definitions",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "user_roles",
                newName: "user_roles",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "user_location_roles",
                newName: "user_location_roles",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "user_delegations",
                newName: "user_delegations",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "system_settings",
                newName: "system_settings",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "roles",
                newName: "roles",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "qdms_personeller",
                newName: "qdms_personeller",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "qdms_personel_sync_logs",
                newName: "qdms_personel_sync_logs",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "integration_queries",
                newName: "integration_queries",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "form_types",
                newName: "form_types",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "form_sections",
                newName: "form_sections",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "form_requests",
                newName: "form_requests",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "form_request_values",
                newName: "form_request_values",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "form_request_manual_assignments",
                newName: "form_request_manual_assignments",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "form_request_approvals",
                newName: "form_request_approvals",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "form_fields",
                newName: "form_fields",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "audit_logs",
                newName: "audit_logs",
                newSchema: "public");

            migrationBuilder.RenameTable(
                name: "app_notifications",
                newName: "app_notifications",
                newSchema: "public");

            migrationBuilder.AddColumn<string>(
                name: "CalculationRuleJson",
                schema: "public",
                table: "form_fields",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<int>(
                name: "ColSpan",
                schema: "public",
                table: "form_fields",
                type: "integer",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "CalculationRuleJson",
                schema: "public",
                table: "form_fields");

            migrationBuilder.DropColumn(
                name: "ColSpan",
                schema: "public",
                table: "form_fields");

            migrationBuilder.RenameTable(
                name: "workflow_steps",
                schema: "public",
                newName: "workflow_steps");

            migrationBuilder.RenameTable(
                name: "workflow_definitions",
                schema: "public",
                newName: "workflow_definitions");

            migrationBuilder.RenameTable(
                name: "user_roles",
                schema: "public",
                newName: "user_roles");

            migrationBuilder.RenameTable(
                name: "user_location_roles",
                schema: "public",
                newName: "user_location_roles");

            migrationBuilder.RenameTable(
                name: "user_delegations",
                schema: "public",
                newName: "user_delegations");

            migrationBuilder.RenameTable(
                name: "system_settings",
                schema: "public",
                newName: "system_settings");

            migrationBuilder.RenameTable(
                name: "roles",
                schema: "public",
                newName: "roles");

            migrationBuilder.RenameTable(
                name: "qdms_personeller",
                schema: "public",
                newName: "qdms_personeller");

            migrationBuilder.RenameTable(
                name: "qdms_personel_sync_logs",
                schema: "public",
                newName: "qdms_personel_sync_logs");

            migrationBuilder.RenameTable(
                name: "integration_queries",
                schema: "public",
                newName: "integration_queries");

            migrationBuilder.RenameTable(
                name: "form_types",
                schema: "public",
                newName: "form_types");

            migrationBuilder.RenameTable(
                name: "form_sections",
                schema: "public",
                newName: "form_sections");

            migrationBuilder.RenameTable(
                name: "form_requests",
                schema: "public",
                newName: "form_requests");

            migrationBuilder.RenameTable(
                name: "form_request_values",
                schema: "public",
                newName: "form_request_values");

            migrationBuilder.RenameTable(
                name: "form_request_manual_assignments",
                schema: "public",
                newName: "form_request_manual_assignments");

            migrationBuilder.RenameTable(
                name: "form_request_approvals",
                schema: "public",
                newName: "form_request_approvals");

            migrationBuilder.RenameTable(
                name: "form_fields",
                schema: "public",
                newName: "form_fields");

            migrationBuilder.RenameTable(
                name: "audit_logs",
                schema: "public",
                newName: "audit_logs");

            migrationBuilder.RenameTable(
                name: "app_notifications",
                schema: "public",
                newName: "app_notifications");
        }
    }
}
