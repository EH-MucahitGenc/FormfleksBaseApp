namespace FormfleksBaseApp.DynamicForms.Domain.Enums;

/// <summary>
/// Dinamik formlardaki giriş alanlarının (input) tiplerini belirtir.
/// </summary>
public enum DynamicFieldType
{
    Text = 1,
    TextArea = 2,
    Number = 3,
    Date = 4,
    DateTime = 5,
    Time = 6,
    Select = 7,
    Radio = 8,
    Checkbox = 9,
    File = 10,
    
    /// <summary>
    /// Kullanıcının form içerisinde tablo/satır bazlı (Master-Detail) çoklu veri girebildiği, alt alanları (kolonları) barındıran kompleks alan tipidir.
    /// </summary>
    Grid = 11
}
