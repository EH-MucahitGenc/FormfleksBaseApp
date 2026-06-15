using System;

class Program {
    static void Main() {
        string val = "\"2026-06-13T21:00:00.000Z\"";
        bool result = DateTimeOffset.TryParse(val, out var dtoff);
        Console.WriteLine($"Result: {result}, Value: {dtoff}");
        
        string val2 = "2026-06-13T21:00:00.000Z";
        bool result2 = DateTimeOffset.TryParse(val2, out var dtoff2);
        Console.WriteLine($"Result2: {result2}, Value2: {dtoff2}");
    }
}
