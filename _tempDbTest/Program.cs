using System;
using Npgsql;

class Program {
    static void Main() {
        var connStr = "Host=localhost;Port=5432;Database=formfleks_base_app;Username=postgres;Password=123456";
        using var conn = new NpgsqlConnection(connStr);
        conn.Open();
        
        string sql1 = "SELECT id, code FROM form_types WHERE code='BUROCELO' OR code='LEAVE_REQ' LIMIT 2";
        using var cmd1 = new NpgsqlCommand(sql1, conn);
        using var reader1 = cmd1.ExecuteReader();
        var ids = new System.Collections.Generic.Dictionary<string, string>();
        while(reader1.Read()) {
            ids[reader1.GetGuid(0).ToString()] = reader1.GetString(1);
        }
        reader1.Close();
        
        foreach(var kvp in ids) {
            string id = kvp.Key;
            Console.WriteLine("--- FormType: " + kvp.Value + " (" + id + ")");
            string sql2 = "SELECT id, field_key, active FROM form_fields WHERE form_type_id='" + id + "'";
            using var cmd2 = new NpgsqlCommand(sql2, conn);
            using var reader2 = cmd2.ExecuteReader();
            int c = 0;
            while(reader2.Read()) {
                c++;
                Console.WriteLine($"Field: {reader2.GetString(1)} (Active: {reader2.GetBoolean(2)})");
            }
            Console.WriteLine("Total fields: " + c);
            reader2.Close();
            
            Console.WriteLine("Checking Latest Request for this form...");
            string sql3 = "SELECT id, created_at, request_no FROM form_requests WHERE form_type_id='" + id + "' ORDER BY created_at DESC LIMIT 1";
            using var cmd3 = new NpgsqlCommand(sql3, conn);
            using var reader3 = cmd3.ExecuteReader();
            string reqId = null;
            if(reader3.Read()) {
                reqId = reader3.GetGuid(0).ToString();
                Console.WriteLine($"Latest request: {reader3.GetString(2)} ({reqId}) at {reader3.GetDateTime(1).ToLocalTime()}");
            }
            reader3.Close();
            
            if (reqId != null) {
                string sql4 = "SELECT field_key, value_text FROM form_request_values WHERE request_id='" + reqId + "'";
                using var cmd4 = new NpgsqlCommand(sql4, conn);
                using var reader4 = cmd4.ExecuteReader();
                int vc = 0;
                while(reader4.Read()) {
                    vc++;
                    Console.WriteLine($"Val: {reader4.GetString(0)} = {(!reader4.IsDBNull(1) ? reader4.GetString(1) : "null")}");
                }
                Console.WriteLine("Total values: " + vc);
            }
        }
    }
}
