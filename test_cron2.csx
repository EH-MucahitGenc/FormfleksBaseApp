using System;
using Cronos;

var cronStr = "57 14 * * *";
var expression = CronExpression.Parse(cronStr, CronFormat.Standard);

TimeZoneInfo _timeZoneInfo;
try
{
    _timeZoneInfo = TimeZoneInfo.FindSystemTimeZoneById("Turkey Standard Time");
}
catch (TimeZoneNotFoundException)
{
    _timeZoneInfo = TimeZoneInfo.FindSystemTimeZoneById("Europe/Istanbul");
}

var now = new DateTimeOffset(2026, 6, 16, 11, 57, 0, TimeSpan.Zero);
var baseTime = new DateTimeOffset(now.Year, now.Month, now.Day, now.Hour, now.Minute, 0, now.Offset);

var next = expression.GetNextOccurrence(baseTime, _timeZoneInfo, inclusive: true);

Console.WriteLine($"now: {now}");
Console.WriteLine($"baseTime: {baseTime}");
Console.WriteLine($"next: {next}");
Console.WriteLine($"next.Value <= now: {next.Value <= now}");

var delay = next.Value - now;
Console.WriteLine($"delay: {delay}");
