using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class GeneralizeFormRequestAssignments : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameTable(
                name: "form_request_approval_candidates",
                schema: "public",
                newName: "form_request_assignments",
                newSchema: "public");

            migrationBuilder.Sql("""
                ALTER TABLE public.form_request_assignments
                RENAME CONSTRAINT "PK_form_request_approval_candidates" TO "PK_form_request_assignments";
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_form_request_approval_candidates_form_request_approvals_app~",
                schema: "public",
                table: "form_request_assignments");

            migrationBuilder.DropIndex(
                name: "IX_form_request_approval_candidates_approval_id_user_id",
                schema: "public",
                table: "form_request_assignments");

            migrationBuilder.DropIndex(
                name: "IX_form_request_approval_candidates_user_id_approval_id",
                schema: "public",
                table: "form_request_assignments");

            migrationBuilder.AddColumn<Guid>(
                name: "request_id",
                schema: "public",
                table: "form_request_assignments",
                type: "uuid",
                nullable: true);

            migrationBuilder.AddColumn<short>(
                name: "assignment_type",
                schema: "public",
                table: "form_request_assignments",
                type: "smallint",
                nullable: false,
                defaultValue: (short)2);

            migrationBuilder.Sql("""
                UPDATE public.form_request_assignments AS assignment
                SET request_id = approval.request_id,
                    assignment_type = 2
                FROM public.form_request_approvals AS approval
                WHERE approval.id = assignment.approval_id;

                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM public.form_request_assignments
                        WHERE request_id IS NULL
                    ) THEN
                        RAISE EXCEPTION 'Form request assignment backfill failed; migration rolled back without deleting data.';
                    END IF;
                END $$;
                """);

            migrationBuilder.AlterColumn<Guid>(
                name: "request_id",
                schema: "public",
                table: "form_request_assignments",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.AlterColumn<Guid>(
                name: "approval_id",
                schema: "public",
                table: "form_request_assignments",
                type: "uuid",
                nullable: true,
                oldClrType: typeof(Guid),
                oldType: "uuid");

            migrationBuilder.AddCheckConstraint(
                name: "ck_form_request_assignments_shape",
                schema: "public",
                table: "form_request_assignments",
                sql: "(assignment_type = 1 AND approval_id IS NULL) OR (assignment_type = 2 AND approval_id IS NOT NULL)");

            migrationBuilder.AddForeignKey(
                name: "FK_form_request_assignments_form_request_approvals_approval_id",
                schema: "public",
                table: "form_request_assignments",
                column: "approval_id",
                principalSchema: "public",
                principalTable: "form_request_approvals",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.AddForeignKey(
                name: "FK_form_request_assignments_form_requests_request_id",
                schema: "public",
                table: "form_request_assignments",
                column: "request_id",
                principalSchema: "public",
                principalTable: "form_requests",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.CreateIndex(
                name: "IX_form_request_assignments_approval_id_user_id",
                schema: "public",
                table: "form_request_assignments",
                columns: new[] { "approval_id", "user_id" },
                unique: true,
                filter: "approval_id IS NOT NULL AND assignment_type = 2");

            migrationBuilder.CreateIndex(
                name: "IX_form_request_assignments_request_id_user_id",
                schema: "public",
                table: "form_request_assignments",
                columns: new[] { "request_id", "user_id" },
                unique: true,
                filter: "approval_id IS NULL AND assignment_type = 1");

            migrationBuilder.CreateIndex(
                name: "IX_form_request_assignments_user_id_assignment_type_request_id",
                schema: "public",
                table: "form_request_assignments",
                columns: new[] { "user_id", "assignment_type", "request_id" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.Sql("""
                DO $$
                BEGIN
                    IF EXISTS (
                        SELECT 1
                        FROM public.form_request_assignments
                        WHERE assignment_type <> 2 OR approval_id IS NULL
                    ) THEN
                        RAISE EXCEPTION 'Migration cannot be reverted while draft evaluator assignments exist; no data was deleted.';
                    END IF;
                END $$;
                """);

            migrationBuilder.DropForeignKey(
                name: "FK_form_request_assignments_form_request_approvals_approval_id",
                schema: "public",
                table: "form_request_assignments");

            migrationBuilder.DropForeignKey(
                name: "FK_form_request_assignments_form_requests_request_id",
                schema: "public",
                table: "form_request_assignments");

            migrationBuilder.DropCheckConstraint(
                name: "ck_form_request_assignments_shape",
                schema: "public",
                table: "form_request_assignments");

            migrationBuilder.DropIndex(
                name: "IX_form_request_assignments_approval_id_user_id",
                schema: "public",
                table: "form_request_assignments");

            migrationBuilder.DropIndex(
                name: "IX_form_request_assignments_request_id_user_id",
                schema: "public",
                table: "form_request_assignments");

            migrationBuilder.DropIndex(
                name: "IX_form_request_assignments_user_id_assignment_type_request_id",
                schema: "public",
                table: "form_request_assignments");

            migrationBuilder.AlterColumn<Guid>(
                name: "approval_id",
                schema: "public",
                table: "form_request_assignments",
                type: "uuid",
                nullable: false,
                oldClrType: typeof(Guid),
                oldType: "uuid",
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "request_id",
                schema: "public",
                table: "form_request_assignments");

            migrationBuilder.DropColumn(
                name: "assignment_type",
                schema: "public",
                table: "form_request_assignments");

            migrationBuilder.CreateIndex(
                name: "IX_form_request_approval_candidates_approval_id_user_id",
                schema: "public",
                table: "form_request_assignments",
                columns: new[] { "approval_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_form_request_approval_candidates_user_id_approval_id",
                schema: "public",
                table: "form_request_assignments",
                columns: new[] { "user_id", "approval_id" });

            migrationBuilder.AddForeignKey(
                name: "FK_form_request_approval_candidates_form_request_approvals_app~",
                schema: "public",
                table: "form_request_assignments",
                column: "approval_id",
                principalSchema: "public",
                principalTable: "form_request_approvals",
                principalColumn: "id",
                onDelete: ReferentialAction.Cascade);

            migrationBuilder.Sql("""
                ALTER TABLE public.form_request_assignments
                RENAME CONSTRAINT "PK_form_request_assignments" TO "PK_form_request_approval_candidates";
                """);

            migrationBuilder.RenameTable(
                name: "form_request_assignments",
                schema: "public",
                newName: "form_request_approval_candidates",
                newSchema: "public");
        }
    }
}
