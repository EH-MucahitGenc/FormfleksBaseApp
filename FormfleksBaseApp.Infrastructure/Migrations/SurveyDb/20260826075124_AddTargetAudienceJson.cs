using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.SurveyDb
{
    /// <inheritdoc />
    public partial class AddTargetAudienceJson : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "target_audience_json",
                table: "survey_campaigns",
                type: "jsonb",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "target_audience_json",
                table: "survey_campaigns");
        }
    }
}
