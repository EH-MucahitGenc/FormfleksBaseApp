using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.DynamicFormsDb
{
    /// <inheritdoc />
    public partial class AddFormRequestApprovalLocation : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "approval_location_name",
                schema: "public",
                table: "form_requests",
                type: "character varying(150)",
                maxLength: 150,
                nullable: true);

            // Existing in-progress forms can already be waiting for a location role.
            // Only fill forms without an active requestor location, using their first
            // manually assigned approver. Other approval routes remain unchanged.
            migrationBuilder.Sql("""
                WITH first_manual_location AS (
                    SELECT DISTINCT ON (assignment.form_request_id)
                        assignment.form_request_id,
                        person.isyeri_tanimi
                    FROM public.form_request_manual_assignments AS assignment
                    JOIN public.form_request_approvals AS pending
                      ON pending.request_id = assignment.form_request_id
                     AND pending.status = 1
                     AND assignment.step_no < pending.step_no
                    JOIN public.workflow_steps AS location_step
                      ON location_step.id = pending.workflow_step_id
                     AND location_step.assignee_type = 15
                    JOIN public.qdms_personeller AS person
                      ON person.linked_user_id = assignment.assignee_user_id
                     AND person.is_active = true
                    WHERE assignment.assignee_user_id IS NOT NULL
                      AND NULLIF(BTRIM(person.isyeri_tanimi), '') IS NOT NULL
                    ORDER BY assignment.form_request_id, assignment.step_no,
                             person.last_sync_date DESC NULLS LAST
                )
                UPDATE public.form_requests AS request
                   SET approval_location_name = first_manual_location.isyeri_tanimi
                  FROM first_manual_location
                 WHERE request.id = first_manual_location.form_request_id
                   AND request.status = 3
                   AND request.approval_location_name IS NULL
                   AND NOT EXISTS (
                       SELECT 1
                         FROM public.qdms_personeller AS requestor
                        WHERE requestor.linked_user_id = request.requestor_user_id
                          AND requestor.is_active = true
                          AND NULLIF(BTRIM(requestor.isyeri_tanimi), '') IS NOT NULL
                   );
                """);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "approval_location_name",
                schema: "public",
                table: "form_requests");
        }
    }
}
