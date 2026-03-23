using System;

namespace FormfleksBaseApp.Application.Features.Admin.Queries.GetPersonnels;

public class QdmsPersonelDto
{
    public Guid Id { get; set; }
    public string Sirket { get; set; } = string.Empty;
    public string? Isyeri_Tanimi { get; set; }
    public string Sicil_No { get; set; } = string.Empty;
    public string? Adi { get; set; }
    public string? Soyadi { get; set; }
    public string? Email { get; set; }
    public string? Pozisyon_Kodu { get; set; }
    public string? Pozisyon_Aciklamasi { get; set; }
    public string? Ust_Pozisyon_Kodu { get; set; }
    public string? Departman_Kodu { get; set; }
    public string? Departman_Adi { get; set; }
    public bool IsActive { get; set; }
    public DateTime? LastSyncDate { get; set; }
    
    // UI Extra
    public string? LinkedUserFullName { get; set; }
}
