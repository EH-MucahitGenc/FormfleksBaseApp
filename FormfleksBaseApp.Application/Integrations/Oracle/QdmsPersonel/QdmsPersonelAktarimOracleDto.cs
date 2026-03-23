namespace FormfleksBaseApp.Application.Integrations.Oracle.QdmsPersonel;

public class QdmsPersonelAktarimOracleDto
{
    public string Sirket { get; set; } = default!;
    public string? isyeri_kodu { get; set; }
    public string? Isyeri_Tanimi { get; set; }
    public string? grup_kodu { get; set; }
    public string? grup_kodu_aciklama { get; set; }
    public string Sicil_No { get; set; } = default!;
    public string? Adi { get; set; }
    public string? Soyadi { get; set; }
    public string? Email { get; set; }
    public string? Pozisyon_Kodu { get; set; }
    public string? Pozisyon_Aciklamasi { get; set; }
    public string? Ust_Pozisyon_Kodu { get; set; }
    public string? Departman_Kodu { get; set; }
    public string? Departman_Adi { get; set; }
}
