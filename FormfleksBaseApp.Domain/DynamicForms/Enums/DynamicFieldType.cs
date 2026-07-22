namespace FormfleksBaseApp.DynamicForms.Domain.Enums;

/// <summary>
/// Dinamik formlardaki giriş alanlarının (input) tiplerini belirtir.
/// NOT: React tarafındaki eşleştirmelerle (dynamic-form.service.ts) %100 uyumlu olmalıdır.
/// </summary>
public enum DynamicFieldType
{
    Text = 1,
    TextArea = 2,
    Boolean = 3, // React UI uses 3 for Checkbox
    Select = 4,  // React UI uses 4 for Dropdown
    Date = 5,
    Time = 6,
    DateTime = 7,
    Number = 8,  // Added new for Number type
    File = 10,
    Grid = 11,
    Calculation = 12,
    StaticHtml = 13
}
