using System;
using System.Threading.Tasks;
using Npgsql;

namespace DbPatcher
{
    class Program
    {
        static async Task Main(string[] args)
        {
            Console.WriteLine("Starting Database Patch...");
            string connString = "Host=localhost;Port=5432;Database=formfleks_base_app;Username=postgres;Password=123456";

            string[] queries = new[]
            {
                "ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"created_at\" timestamp with time zone DEFAULT CURRENT_TIMESTAMP;",
                "ALTER TABLE \"users\" ADD COLUMN IF NOT EXISTS \"updated_at\" timestamp with time zone;",
                "ALTER TABLE \"roles\" ADD COLUMN IF NOT EXISTS \"created_at\" timestamp with time zone DEFAULT CURRENT_TIMESTAMP;",
                "ALTER TABLE \"roles\" ADD COLUMN IF NOT EXISTS \"updated_at\" timestamp with time zone;",
                "ALTER TABLE \"permissions\" ADD COLUMN IF NOT EXISTS \"created_at\" timestamp with time zone DEFAULT CURRENT_TIMESTAMP;",
                "ALTER TABLE \"permissions\" ADD COLUMN IF NOT EXISTS \"updated_at\" timestamp with time zone;",
                "ALTER TABLE \"visitors\" ADD COLUMN IF NOT EXISTS \"created_at\" timestamp with time zone DEFAULT CURRENT_TIMESTAMP;",
                "ALTER TABLE \"visitors\" ADD COLUMN IF NOT EXISTS \"updated_at\" timestamp with time zone;",
                "ALTER TABLE \"refresh_tokens\" ADD COLUMN IF NOT EXISTS \"created_at\" timestamp with time zone DEFAULT CURRENT_TIMESTAMP;",
                "ALTER TABLE \"refresh_tokens\" ADD COLUMN IF NOT EXISTS \"updated_at\" timestamp with time zone;",
                "ALTER TABLE \"form_requests\" ADD COLUMN IF NOT EXISTS \"created_at\" timestamp with time zone DEFAULT CURRENT_TIMESTAMP;",
                "ALTER TABLE \"form_requests\" ADD COLUMN IF NOT EXISTS \"submitted_at\" timestamp with time zone;",
                "ALTER TABLE \"form_requests\" ADD COLUMN IF NOT EXISTS \"completed_at\" timestamp with time zone;",
                "ALTER TABLE \"form_types\" ADD COLUMN IF NOT EXISTS \"created_at\" timestamp with time zone DEFAULT CURRENT_TIMESTAMP;"
            };

            try
            {
                using var conn = new NpgsqlConnection(connString);
                await conn.OpenAsync();

                foreach (var q in queries)
                {
                    try
                    {
                        using var cmd = new NpgsqlCommand(q, conn);
                        await cmd.ExecuteNonQueryAsync();
                        Console.WriteLine($"Executed: {q}");
                    }
                    catch (Exception ex)
                    {
                        Console.WriteLine($"Warning for query ({q}): {ex.Message}");
                    }
                }

                Console.WriteLine("Patch completed successfully.");
            }
            catch (Exception ex)
            {
                Console.WriteLine($"Error during patch: {ex.Message}");
            }
        }
    }
}
