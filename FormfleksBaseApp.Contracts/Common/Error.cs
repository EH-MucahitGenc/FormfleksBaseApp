namespace FormfleksBaseApp.Contracts.Common;

/// <summary>
/// Sistem içerisinde oluşan iş kuralları (Business Rule) ihlallerini veya diğer hataları
/// standart bir kod ve mesaj ile temsil eden kayıt (record) yapısı.
/// </summary>
public sealed record Error(string Code, string Message)
{
    public static readonly Error None = new(string.Empty, string.Empty);
    public static readonly Error NullValue = new("Error.NullValue", "The specified result value is null.");
    public static readonly Error ConditionNotMet = new("Error.ConditionNotMet", "The specified condition was not met.");
}
