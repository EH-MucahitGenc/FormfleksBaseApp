using System;
using System.IO;
using Npgsql;
using System.Text.Json;

class Program
{
    static void Main()
    {
        var appSettingsData = File.ReadAllText(@"C:\ErkurtProjeler\FormfleksBaseApp\FormfleksBaseApp.Api\appsettings.json");
        using var jsonDoc = JsonDocument.Parse(appSettingsData);
        var connStr = jsonDoc.RootElement.GetProperty("ConnectionStrings").GetProperty("Default").GetString();

        using var conn = new NpgsqlConnection(connStr);
        conn.Open();

        Console.WriteLine("\n--- OPTIONS JSON ---");
        using var cmd = new NpgsqlCommand("SELECT field_key, field_type, options_json FROM form_fields", conn);
        using var reader = cmd.ExecuteReader();
        while(reader.Read())
        {
            Console.WriteLine($"Key: {reader.GetString(0)}, Type: {reader.GetInt16(1)}, Options: {(reader.IsDBNull(2) ? "null" : reader.GetString(2))}");
        }
        reader.Close();

        Console.WriteLine("\n--- VALUES ---");
        using var cmd2 = new NpgsqlCommand("SELECT field_key, value_text, value_number, value_datetime FROM form_request_values LIMIT 20", conn);
        using var reader2 = cmd2.ExecuteReader();
        while(reader2.Read())
        {
            Console.WriteLine($"Key: {reader2.GetString(0)}, Text: {(reader2.IsDBNull(1) ? "null" : reader2.GetString(1))}, Number: {(reader2.IsDBNull(2) ? "null" : reader2.GetDecimal(2).ToString())}, DateTime: {(reader2.IsDBNull(3) ? "null" : reader2.GetDateTime(3).ToString("O"))}");
        }
    }
}
