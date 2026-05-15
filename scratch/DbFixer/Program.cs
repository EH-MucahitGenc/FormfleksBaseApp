using Npgsql;
using System;
using System.IO;

class Program
{
    static void Main()
    {
        string connString = "Host=localhost;Port=5432;Database=formfleks_base_app;Username=postgres;Password=123456";
        string sql = File.ReadAllText(@"..\..\create_permissions.sql");

        using (var conn = new NpgsqlConnection(connString))
        {
            conn.Open();
            using (var cmd = new NpgsqlCommand(sql, conn))
            {
                cmd.ExecuteNonQuery();
            }
        }
        Console.WriteLine("Permissions tables created successfully.");
    }
}
