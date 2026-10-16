namespace FormfleksBaseApp.Domain.Constants;

public static class ProbationFormConstants
{
    private static readonly System.Globalization.CultureInfo TurkishCulture =
        System.Globalization.CultureInfo.GetCultureInfo("tr-TR");

    public static readonly Guid SystemUserId = Guid.Parse("00000000-0000-0000-0000-000000000001");

    public static bool IsProbationForm(string? systemUsageType) =>
        systemUsageType is "2_AY_DENEME" or "6_AY_DENEME";

    public static bool IsGrayCollar(string? groupDescription)
    {
        var value = groupDescription?.Trim().ToUpper(TurkishCulture);
        return value is "GRİ YAKA" or "GRI YAKA";
    }
}
