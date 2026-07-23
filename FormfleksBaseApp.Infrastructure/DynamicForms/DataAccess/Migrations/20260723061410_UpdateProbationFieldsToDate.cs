using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Migrations
{
    /// <inheritdoc />
    public partial class UpdateProbationFieldsToDate : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "Dogum_Tarihi",
                schema: "public",
                table: "qdms_personeller",
                newName: "dogum_tarihi");

            migrationBuilder.RenameColumn(
                name: "Deneme6Ay_Trh",
                schema: "public",
                table: "qdms_personeller",
                newName: "deneme6ay_trh");

            migrationBuilder.RenameColumn(
                name: "Deneme2Ay_Trh",
                schema: "public",
                table: "qdms_personeller",
                newName: "deneme2ay_trh");

            migrationBuilder.RenameColumn(
                name: "Baslama_Tarihi",
                schema: "public",
                table: "qdms_personeller",
                newName: "baslama_tarihi");
                
            migrationBuilder.Sql("TRUNCATE TABLE public.qdms_personeller;");

            migrationBuilder.AlterColumn<DateTime>(
                name: "deneme6ay_trh",
                schema: "public",
                table: "qdms_personeller",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "deneme2ay_trh",
                schema: "public",
                table: "qdms_personeller",
                type: "date",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "timestamp with time zone",
                oldNullable: true);

            migrationBuilder.DropColumn(
                name: "baslama_tarihi",
                schema: "public",
                table: "qdms_personeller");

            migrationBuilder.AddColumn<DateTime>(
                name: "baslama_tarihi",
                schema: "public",
                table: "qdms_personeller",
                type: "date",
                nullable: true);
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.RenameColumn(
                name: "dogum_tarihi",
                schema: "public",
                table: "qdms_personeller",
                newName: "Dogum_Tarihi");

            migrationBuilder.RenameColumn(
                name: "deneme6ay_trh",
                schema: "public",
                table: "qdms_personeller",
                newName: "Deneme6Ay_Trh");

            migrationBuilder.RenameColumn(
                name: "deneme2ay_trh",
                schema: "public",
                table: "qdms_personeller",
                newName: "Deneme2Ay_Trh");

            migrationBuilder.RenameColumn(
                name: "baslama_tarihi",
                schema: "public",
                table: "qdms_personeller",
                newName: "Baslama_Tarihi");

            migrationBuilder.AlterColumn<DateTime>(
                name: "Dogum_Tarihi",
                schema: "public",
                table: "qdms_personeller",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "Deneme6Ay_Trh",
                schema: "public",
                table: "qdms_personeller",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.AlterColumn<DateTime>(
                name: "Deneme2Ay_Trh",
                schema: "public",
                table: "qdms_personeller",
                type: "timestamp with time zone",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "date",
                oldNullable: true);

            migrationBuilder.AlterColumn<string>(
                name: "Baslama_Tarihi",
                schema: "public",
                table: "qdms_personeller",
                type: "text",
                nullable: true,
                oldClrType: typeof(DateTime),
                oldType: "date",
                oldNullable: true);
        }
    }
}
