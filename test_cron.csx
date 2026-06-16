using System;
using Cronos;

var cron = CronExpression.Parse("42 14 * * *", CronFormat.Standard);
var tz = TimeZoneInfo.FindSystemTimeZoneById("Turkey Standard Time");

var t1 = new DateTimeOffset(2026, 6, 16, 11, 41, 30, TimeSpan.Zero);
var next1 = cron.GetNextOccurrence(t1, tz);
Console.WriteLine($"t1: {t1}, next1: {next1}, delay1: {next1 - t1}");

var t2 = new DateTimeOffset(2026, 6, 16, 11, 42, 0, TimeSpan.Zero);
var next2 = cron.GetNextOccurrence(t2, tz);
Console.WriteLine($"t2: {t2}, next2: {next2}, delay2: {next2 - t2}");

var t3 = new DateTimeOffset(2026, 6, 16, 11, 42, 1, TimeSpan.Zero);
var next3 = cron.GetNextOccurrence(t3, tz);
Console.WriteLine($"t3: {t3}, next3: {next3}, delay3: {next3 - t3}");
