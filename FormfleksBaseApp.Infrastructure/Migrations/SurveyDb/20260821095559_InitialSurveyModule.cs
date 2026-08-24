using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.SurveyDb
{
    /// <inheritdoc />
    public partial class InitialSurveyModule : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "survey_templates",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    default_is_anonymous = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_survey_templates", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "survey_template_versions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    survey_template_id = table.Column<Guid>(type: "uuid", nullable: false),
                    version_number = table.Column<int>(type: "integer", nullable: false),
                    is_published = table.Column<bool>(type: "boolean", nullable: false),
                    published_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    published_by_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    notes = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_survey_template_versions", x => x.id);
                    table.ForeignKey(
                        name: "FK_survey_template_versions_survey_templates_survey_template_id",
                        column: x => x.survey_template_id,
                        principalTable: "survey_templates",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "survey_campaigns",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    survey_template_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    is_anonymous = table.Column<bool>(type: "boolean", nullable: false),
                    status = table.Column<short>(type: "smallint", nullable: false),
                    start_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    end_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    email_subject = table.Column<string>(type: "character varying(250)", maxLength: 250, nullable: true),
                    email_body_template = table.Column<string>(type: "text", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_survey_campaigns", x => x.id);
                    table.ForeignKey(
                        name: "FK_survey_campaigns_survey_template_versions_survey_template_v~",
                        column: x => x.survey_template_version_id,
                        principalTable: "survey_template_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "survey_version_sections",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    survey_template_version_id = table.Column<Guid>(type: "uuid", nullable: false),
                    title = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_survey_version_sections", x => x.id);
                    table.ForeignKey(
                        name: "FK_survey_version_sections_survey_template_versions_survey_tem~",
                        column: x => x.survey_template_version_id,
                        principalTable: "survey_template_versions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "survey_assignments",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    survey_campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    token = table.Column<Guid>(type: "uuid", nullable: false),
                    status = table.Column<short>(type: "smallint", nullable: false),
                    email_sent_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    completed_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_survey_assignments", x => x.id);
                    table.ForeignKey(
                        name: "FK_survey_assignments_survey_campaigns_survey_campaign_id",
                        column: x => x.survey_campaign_id,
                        principalTable: "survey_campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "survey_result_viewers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    survey_campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_survey_result_viewers", x => x.id);
                    table.ForeignKey(
                        name: "FK_survey_result_viewers_survey_campaigns_survey_campaign_id",
                        column: x => x.survey_campaign_id,
                        principalTable: "survey_campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "survey_version_questions",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    survey_version_section_id = table.Column<Guid>(type: "uuid", nullable: false),
                    question_type = table.Column<short>(type: "smallint", nullable: false),
                    title = table.Column<string>(type: "character varying(500)", maxLength: 500, nullable: false),
                    description = table.Column<string>(type: "text", nullable: true),
                    is_required = table.Column<bool>(type: "boolean", nullable: false),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    settings_json = table.Column<string>(type: "jsonb", nullable: true),
                    visibility_rule_json = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_survey_version_questions", x => x.id);
                    table.ForeignKey(
                        name: "FK_survey_version_questions_survey_version_sections_survey_ver~",
                        column: x => x.survey_version_section_id,
                        principalTable: "survey_version_sections",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "survey_responses",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    survey_campaign_id = table.Column<Guid>(type: "uuid", nullable: false),
                    survey_assignment_id = table.Column<Guid>(type: "uuid", nullable: true),
                    user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    started_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    submitted_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_survey_responses", x => x.id);
                    table.ForeignKey(
                        name: "FK_survey_responses_survey_assignments_survey_assignment_id",
                        column: x => x.survey_assignment_id,
                        principalTable: "survey_assignments",
                        principalColumn: "id",
                        onDelete: ReferentialAction.SetNull);
                    table.ForeignKey(
                        name: "FK_survey_responses_survey_campaigns_survey_campaign_id",
                        column: x => x.survey_campaign_id,
                        principalTable: "survey_campaigns",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "survey_question_options",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    survey_version_question_id = table.Column<Guid>(type: "uuid", nullable: false),
                    label = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: false),
                    value = table.Column<string>(type: "character varying(200)", maxLength: 200, nullable: true),
                    sort_order = table.Column<int>(type: "integer", nullable: false),
                    is_other_option = table.Column<bool>(type: "boolean", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_survey_question_options", x => x.id);
                    table.ForeignKey(
                        name: "FK_survey_question_options_survey_version_questions_survey_ver~",
                        column: x => x.survey_version_question_id,
                        principalTable: "survey_version_questions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateTable(
                name: "survey_answers",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    survey_response_id = table.Column<Guid>(type: "uuid", nullable: false),
                    survey_version_question_id = table.Column<Guid>(type: "uuid", nullable: false),
                    value_text = table.Column<string>(type: "text", nullable: true),
                    value_number = table.Column<decimal>(type: "numeric(18,6)", nullable: true),
                    value_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    value_json = table.Column<string>(type: "jsonb", nullable: true),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_survey_answers", x => x.id);
                    table.ForeignKey(
                        name: "FK_survey_answers_survey_responses_survey_response_id",
                        column: x => x.survey_response_id,
                        principalTable: "survey_responses",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                    table.ForeignKey(
                        name: "FK_survey_answers_survey_version_questions_survey_version_ques~",
                        column: x => x.survey_version_question_id,
                        principalTable: "survey_version_questions",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Restrict);
                });

            migrationBuilder.CreateTable(
                name: "survey_answer_files",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    survey_answer_id = table.Column<Guid>(type: "uuid", nullable: false),
                    file_name = table.Column<string>(type: "character varying(255)", maxLength: 255, nullable: false),
                    file_path = table.Column<string>(type: "character varying(1000)", maxLength: 1000, nullable: false),
                    content_type = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: false),
                    file_size = table.Column<long>(type: "bigint", nullable: false),
                    created_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: false, defaultValueSql: "CURRENT_TIMESTAMP"),
                    updated_at = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    active = table.Column<bool>(type: "boolean", nullable: false, defaultValue: true)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_survey_answer_files", x => x.id);
                    table.ForeignKey(
                        name: "FK_survey_answer_files_survey_answers_survey_answer_id",
                        column: x => x.survey_answer_id,
                        principalTable: "survey_answers",
                        principalColumn: "id",
                        onDelete: ReferentialAction.Cascade);
                });

            migrationBuilder.CreateIndex(
                name: "IX_survey_answer_files_survey_answer_id",
                table: "survey_answer_files",
                column: "survey_answer_id");

            migrationBuilder.CreateIndex(
                name: "IX_survey_answers_survey_response_id",
                table: "survey_answers",
                column: "survey_response_id");

            migrationBuilder.CreateIndex(
                name: "IX_survey_answers_survey_version_question_id",
                table: "survey_answers",
                column: "survey_version_question_id");

            migrationBuilder.CreateIndex(
                name: "IX_survey_assignments_survey_campaign_id_user_id",
                table: "survey_assignments",
                columns: new[] { "survey_campaign_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_survey_assignments_token",
                table: "survey_assignments",
                column: "token",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_survey_campaigns_survey_template_version_id",
                table: "survey_campaigns",
                column: "survey_template_version_id");

            migrationBuilder.CreateIndex(
                name: "IX_survey_question_options_survey_version_question_id",
                table: "survey_question_options",
                column: "survey_version_question_id");

            migrationBuilder.CreateIndex(
                name: "IX_survey_responses_survey_assignment_id",
                table: "survey_responses",
                column: "survey_assignment_id");

            migrationBuilder.CreateIndex(
                name: "IX_survey_responses_survey_campaign_id",
                table: "survey_responses",
                column: "survey_campaign_id");

            migrationBuilder.CreateIndex(
                name: "IX_survey_result_viewers_survey_campaign_id_user_id",
                table: "survey_result_viewers",
                columns: new[] { "survey_campaign_id", "user_id" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_survey_template_versions_survey_template_id_version_number",
                table: "survey_template_versions",
                columns: new[] { "survey_template_id", "version_number" },
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_survey_version_questions_survey_version_section_id",
                table: "survey_version_questions",
                column: "survey_version_section_id");

            migrationBuilder.CreateIndex(
                name: "IX_survey_version_sections_survey_template_version_id",
                table: "survey_version_sections",
                column: "survey_template_version_id");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "survey_answer_files");

            migrationBuilder.DropTable(
                name: "survey_question_options");

            migrationBuilder.DropTable(
                name: "survey_result_viewers");

            migrationBuilder.DropTable(
                name: "survey_answers");

            migrationBuilder.DropTable(
                name: "survey_responses");

            migrationBuilder.DropTable(
                name: "survey_version_questions");

            migrationBuilder.DropTable(
                name: "survey_assignments");

            migrationBuilder.DropTable(
                name: "survey_version_sections");

            migrationBuilder.DropTable(
                name: "survey_campaigns");

            migrationBuilder.DropTable(
                name: "survey_template_versions");

            migrationBuilder.DropTable(
                name: "survey_templates");
        }
    }
}
