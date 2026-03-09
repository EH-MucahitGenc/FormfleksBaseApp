using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.DynamicFormsDb
{
    /// <inheritdoc />
    public partial class InitialDynamicForms : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "audit_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    entity_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    entity_id = table.Column<Guid>(type: "uuid", nullable: false),
                    action_type = table.Column<string>(type: "character varying(80)", maxLength: 80, nullable: false),
                    actor_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    detail_json = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_audit_logs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "authorization_matrix",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    form_type_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_id = table.Column<Guid>(type: "uuid", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    can_create = table.Column<bool>(type: "boolean", nullable: false),
                    can_view_all = table.Column<bool>(type: "boolean", nullable: false),
                    can_approve = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_authorization_matrix", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "departments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_departments", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "form_fields",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    form_type_id = table.Column<Guid>(type: "uuid", nullable: false),
                    section_id = table.Column<Guid>(type: "uuid", nullable: true),
                    field_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    field_type = table.Column<short>(type: "smallint", nullable: false),
                    is_required = table.Column<bool>(type: "boolean", nullable: false),
                    placeholder = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    help_text = table.Column<string>(type: "text", nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    default_value = table.Column<string>(type: "text", nullable: true),
                    visibility_rule_json = table.Column<string>(type: "jsonb", nullable: true),
                    validation_rule_json = table.Column<string>(type: "jsonb", nullable: true),
                    options_json = table.Column<string>(type: "jsonb", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_form_fields", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "form_request_approvals",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    step_no = table.Column<int>(type: "integer", nullable: false),
                    workflow_step_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<short>(type: "smallint", nullable: false),
                    assignee_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    assignee_role_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    action_comment = table.Column<string>(type: "text", nullable: true),
                    action_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    concurrency_token = table.Column<long>(type: "bigint", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_form_request_approvals", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "form_request_values",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    request_id = table.Column<Guid>(type: "uuid", nullable: false),
                    field_id = table.Column<Guid>(type: "uuid", nullable: false),
                    field_key = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    value_text = table.Column<string>(type: "text", nullable: true),
                    value_number = table.Column<decimal>(type: "numeric(18,6)", nullable: true),
                    value_datetime = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    value_bool = table.Column<bool>(type: "boolean", nullable: true),
                    value_json = table.Column<string>(type: "jsonb", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_form_request_values", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "form_requests",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    form_type_id = table.Column<Guid>(type: "uuid", nullable: false),
                    request_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    requestor_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<short>(type: "smallint", nullable: false),
                    current_step_no = table.Column<int>(type: "integer", nullable: true),
                    concurrency_token = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_form_requests", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "form_sections",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    form_type_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_form_sections", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "form_types",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false),
                    created_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_form_types", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "roles",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    code = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_roles", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "user_departments",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    department_id = table.Column<Guid>(type: "uuid", nullable: false),
                    is_primary = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_departments", x => new { x.user_id, x.department_id });
                });

            migrationBuilder.CreateTable(
                name: "user_roles",
                columns: table => new
                {
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    role_id = table.Column<Guid>(type: "uuid", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_user_roles", x => new { x.user_id, x.role_id });
                });

            migrationBuilder.CreateTable(
                name: "workflow_definitions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    form_type_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_no = table.Column<int>(type: "integer", nullable: false),
                    is_active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workflow_definitions", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "workflow_steps",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    workflow_definition_id = table.Column<Guid>(type: "uuid", nullable: false),
                    step_no = table.Column<int>(type: "integer", nullable: false),
                    name = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: false),
                    assignee_type = table.Column<short>(type: "smallint", nullable: false),
                    assignee_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    assignee_role_id = table.Column<Guid>(type: "uuid", nullable: true),
                    dynamic_rule_json = table.Column<string>(type: "jsonb", nullable: true),
                    allow_return_for_revision = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_workflow_steps", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_audit_logs_entity_type_entity_id_created_at",
                table: "audit_logs",
                columns: new[] { "entity_type", "entity_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_authorization_matrix_form_type_id_role_id_user_id",
                table: "authorization_matrix",
                columns: new[] { "form_type_id", "role_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_departments_code",
                table: "departments",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_form_fields_form_type_id_field_key",
                table: "form_fields",
                columns: new[] { "form_type_id", "field_key" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_form_fields_form_type_id_sort_order",
                table: "form_fields",
                columns: new[] { "form_type_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_form_request_approvals_request_id_step_no",
                table: "form_request_approvals",
                columns: new[] { "request_id", "step_no" });

            migrationBuilder.CreateIndex(
                name: "IX_form_request_approvals_status_assignee_role_id_assignee_use~",
                table: "form_request_approvals",
                columns: new[] { "status", "assignee_role_id", "assignee_user_id" });

            migrationBuilder.CreateIndex(
                name: "IX_form_request_values_request_id_field_id",
                table: "form_request_values",
                columns: new[] { "request_id", "field_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_form_request_values_request_id_field_key",
                table: "form_request_values",
                columns: new[] { "request_id", "field_key" });

            migrationBuilder.CreateIndex(
                name: "IX_form_requests_request_no",
                table: "form_requests",
                column: "request_no",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_form_requests_requestor_user_id_created_at",
                table: "form_requests",
                columns: new[] { "requestor_user_id", "created_at" });

            migrationBuilder.CreateIndex(
                name: "IX_form_requests_status_current_step_no",
                table: "form_requests",
                columns: new[] { "status", "current_step_no" });

            migrationBuilder.CreateIndex(
                name: "IX_form_sections_form_type_id_sort_order",
                table: "form_sections",
                columns: new[] { "form_type_id", "sort_order" });

            migrationBuilder.CreateIndex(
                name: "IX_form_types_code",
                table: "form_types",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_roles_code",
                table: "roles",
                column: "code",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_workflow_definitions_form_type_id_is_active",
                table: "workflow_definitions",
                columns: new[] { "form_type_id", "is_active" });

            migrationBuilder.CreateIndex(
                name: "IX_workflow_definitions_form_type_id_version_no",
                table: "workflow_definitions",
                columns: new[] { "form_type_id", "version_no" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_workflow_steps_workflow_definition_id_step_no",
                table: "workflow_steps",
                columns: new[] { "workflow_definition_id", "step_no" },
                unique: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "audit_logs");

            migrationBuilder.DropTable(
                name: "authorization_matrix");

            migrationBuilder.DropTable(
                name: "departments");

            migrationBuilder.DropTable(
                name: "form_fields");

            migrationBuilder.DropTable(
                name: "form_request_approvals");

            migrationBuilder.DropTable(
                name: "form_request_values");

            migrationBuilder.DropTable(
                name: "form_requests");

            migrationBuilder.DropTable(
                name: "form_sections");

            migrationBuilder.DropTable(
                name: "form_types");

            migrationBuilder.DropTable(
                name: "roles");

            migrationBuilder.DropTable(
                name: "user_departments");

            migrationBuilder.DropTable(
                name: "user_roles");

            migrationBuilder.DropTable(
                name: "workflow_definitions");

            migrationBuilder.DropTable(
                name: "workflow_steps");
        }
    }
}
