using System;
using Microsoft.EntityFrameworkCore.Migrations;

#nullable disable

namespace FormfleksBaseApp.Infrastructure.Migrations.DynamicFormsDb
{
    /// <inheritdoc />
    public partial class AddQdmsPersonelSync : Migration
    {
        /// <inheritdoc />
        protected override void Up(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.CreateTable(
                name: "qdms_personel_sync_logs",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    triggered_by_user_id = table.Column<Guid>(type: "uuid", nullable: false),
                    start_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    end_time = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    inserted_count = table.Column<int>(type: "integer", nullable: false),
                    updated_count = table.Column<int>(type: "integer", nullable: false),
                    deactivated_count = table.Column<int>(type: "integer", nullable: false),
                    errors_json = table.Column<string>(type: "jsonb", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qdms_personel_sync_logs", x => x.id);
                });

            migrationBuilder.CreateTable(
                name: "qdms_personeller",
                columns: table => new
                {
                    id = table.Column<Guid>(type: "uuid", nullable: false),
                    sirket = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    isyeri_kodu = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    isyeri_tanimi = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    grup_kodu = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    grup_kodu_aciklama = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    sicil_no = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: false),
                    adi = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    soyadi = table.Column<string>(type: "character varying(100)", maxLength: 100, nullable: true),
                    email = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    pozisyon_kodu = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    pozisyon_aciklamasi = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    ust_pozisyon_kodu = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    departman_kodu = table.Column<string>(type: "character varying(50)", maxLength: 50, nullable: true),
                    departman_adi = table.Column<string>(type: "character varying(150)", maxLength: 150, nullable: true),
                    linked_user_id = table.Column<Guid>(type: "uuid", nullable: true),
                    is_active = table.Column<bool>(type: "boolean", nullable: false),
                    last_sync_date = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    CreatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: false),
                    UpdatedAt = table.Column<DateTime>(type: "timestamp with time zone", nullable: true),
                    Active = table.Column<bool>(type: "boolean", nullable: false)
                },
                constraints: table =>
                {
                    table.PrimaryKey("PK_qdms_personeller", x => x.id);
                });

            migrationBuilder.CreateIndex(
                name: "IX_qdms_personel_sync_logs_start_time",
                table: "qdms_personel_sync_logs",
                column: "start_time");

            migrationBuilder.CreateIndex(
                name: "IX_qdms_personeller_linked_user_id",
                table: "qdms_personeller",
                column: "linked_user_id");

            migrationBuilder.CreateIndex(
                name: "IX_qdms_personeller_pozisyon_kodu",
                table: "qdms_personeller",
                column: "pozisyon_kodu");

            migrationBuilder.CreateIndex(
                name: "IX_qdms_personeller_sicil_no",
                table: "qdms_personeller",
                column: "sicil_no",
                unique: true);

            migrationBuilder.CreateIndex(
                name: "IX_qdms_personeller_ust_pozisyon_kodu",
                table: "qdms_personeller",
                column: "ust_pozisyon_kodu");
        }

        /// <inheritdoc />
        protected override void Down(MigrationBuilder migrationBuilder)
        {
            migrationBuilder.DropTable(
                name: "qdms_personel_sync_logs");

            migrationBuilder.DropTable(
                name: "qdms_personeller");
        }
    }
}
