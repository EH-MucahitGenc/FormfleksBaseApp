using System;
using Npgsql;

var connStr = "Host=localhost;Port=5432;Database=formfleks_base_app;Username=postgres;Password=123456";
using var conn = new NpgsqlConnection(connStr);
conn.Open();

using var cmd1 = conn.CreateCommand();
cmd1.CommandText = @"
CREATE TABLE IF NOT EXISTS ""__EFMigrationsHistory"" (
    ""MigrationId"" character varying(150) NOT NULL,
    ""ProductVersion"" character varying(32) NOT NULL,
    CONSTRAINT ""PK___EFMigrationsHistory"" PRIMARY KEY (""MigrationId"")
);";
cmd1.ExecuteNonQuery();

using var cmd2 = conn.CreateCommand();
cmd2.CommandText = @"
INSERT INTO ""__EFMigrationsHistory"" (""MigrationId"", ""ProductVersion"")
VALUES ('20260309114625_InitialDynamicForms', '8.0.25')
ON CONFLICT (""MigrationId"") DO NOTHING;
";
cmd2.ExecuteNonQuery();

Console.WriteLine("Patcher successful!");
