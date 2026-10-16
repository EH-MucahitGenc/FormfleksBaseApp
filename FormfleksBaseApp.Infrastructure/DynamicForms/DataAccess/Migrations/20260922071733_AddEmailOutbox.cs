using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class AddEmailOutbox : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "email_outbox",
                schema: "public",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    message_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    reference_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    reference_id = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    deduplication_key = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    from_address = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    to_addresses_json = table.Column<string>(type: "jsonb", nullable: false),
                    cc_addresses_json = table.Column<string>(type: "jsonb", nullable: false),
                    bcc_addresses_json = table.Column<string>(type: "jsonb", nullable: false),
                    reply_to_address = table.Column<string>(type: "character varying(320)", maxLength: 320, nullable: true),
                    subject = table.Column<string>(type: "text", nullable: false),
                    body_html = table.Column<string>(type: "text", nullable: false),
                    body_text = table.Column<string>(type: "text", nullable: true),
                    body_sha256 = table.Column<string>(type: "character(64)", maxLength: 64, nullable: false),
                    headers_json = table.Column<string>(type: "jsonb", nullable: false),
                    attachment_manifest_json = table.Column<string>(type: "jsonb", nullable: false),
                    attachment_payload_json = table.Column<string>(type: "jsonb", nullable: true),
                    status = table.Column<short>(type: "smallint", nullable: false),
                    attempt_count = table.Column<int>(type: "integer", nullable: false),
                    max_attempts = table.Column<int>(type: "integer", nullable: false),
                    last_error = table.Column<string>(type: "text", nullable: true),
                    smtp_message_id = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: true),
                    queued_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    first_attempt_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    last_attempt_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    next_attempt_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    locked_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_email_outbox", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_email_outbox_deduplication_key",
                schema: "public",
                table: "email_outbox",
                column: "deduplication_key",
                unique: true,
                filter: "deduplication_key IS NOT NULL");

            migrationBuilder.CreateIndex(
                name: "IX_email_outbox_queued_at",
                schema: "public",
                table: "email_outbox",
                column: "queued_at");

            migrationBuilder.CreateIndex(
                name: "IX_email_outbox_reference_type_reference_id_queued_at",
                schema: "public",
                table: "email_outbox",
                columns: new[] { "reference_type", "reference_id", "queued_at" });

            migrationBuilder.CreateIndex(
                name: "IX_email_outbox_status_next_attempt_at_queued_at",
                schema: "public",
                table: "email_outbox",
                columns: new[] { "status", "next_attempt_at", "queued_at" });
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "email_outbox",
                schema: "public");
        }
    }
}
