using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class FixDogumTarihi : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropColumn(
                name: "dogum_tarihi",
                schema: "public",
                table: "qdms_personeller");

            migrationBuilder.AddColumn<DateTime>(
                name: "dogum_tarihi",
                schema: "public",
                table: "qdms_personeller",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {

        }
    }
}
