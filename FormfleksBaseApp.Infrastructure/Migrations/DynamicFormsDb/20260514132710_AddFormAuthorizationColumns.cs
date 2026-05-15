using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.DynamicFormsDb
{
    /// <inheritdoc />
    public partial class AddFormAuthorizationColumns : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.AddColumn<string>(
                name: "AllowedCreateRoleCodesJson",
                table: "form_types",
                type: "text",
                nullable: true);

            migrationBuilder.AddColumn<string>(
                name: "AllowedReportRoleCodesJson",
                table: "form_types",
                type: "text",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "AllowedCreateRoleCodesJson",
                table: "form_types");

            migrationBuilder.DropColumn(
                name: "AllowedReportRoleCodesJson",
                table: "form_types");
        }
    }
}
