using System;
using Npgsql;
using System.Threading.Tasks;

class Program
{
    static async Task Main()
    {
        try {
            var connStr = "Host=localhost;Port=5432;Database=formfleks_base_app;Username=postgres;Password=123456";
            using var conn = new NpgsqlConnection(connStr);
            await conn.OpenAsync();
            using var cmd = new NpgsqlCommand("SELECT migration_id FROM ""__EFMigrationsHistory"";", conn);
            using var reader = await cmd.ExecuteReaderAsync();
            while (await reader.ReadAsync())
            {
                Console.WriteLine(reader.GetString(0));
            }
        } catch (Exception ex) {
            Console.WriteLine(ex.Message);
        }
    }
}
