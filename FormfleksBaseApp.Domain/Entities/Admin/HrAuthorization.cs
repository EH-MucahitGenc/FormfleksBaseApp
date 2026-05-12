using System;
using FormfleksBaseApp.Domain.Common;

namespace FormfleksBaseApp.Domain.Entities.Admin;

/// <summary>
/// Şube bazlı İK yetkilendirme tablosu.
/// Bu tablo, hangi kullanıcının hangi lokasyondan/şubeden sorumlu olduğunu tutar.
/// Bir kişinin birden fazla şubeye yetkisi varsa, her şube için bu tabloda ayrı bir satır (kayıt) açılır.
/// </summary>
public class HrAuthorization : BaseEntity
{
    /// <summary>
    /// Yetkilendirilen İK personeli
    /// </summary>
    public Guid UserId { get; set; }

    /// <summary>
    /// Eğer bu alan True ise, bu kullanıcı Global İK Müdürüdür (Örn: Burcu, Leyla).
    /// Global müdürler, LocationName alanından bağımsız olarak tüm şubelerden gelen bildirimleri ve onay taleplerini görür.
    /// </summary>
    public bool IsGlobalManager { get; set; }

    /// <summary>
    /// Kullanıcının yetkili olduğu şube adı. (ERKURT_QDMS_PERSONEL_AKTARIM tablosundaki ISYERI_TANIMI ile eşleşir).
    /// Eğer IsGlobalManager True ise, bu alanın bir önemi yoktur (null olabilir).
    /// </summary>
    public string? LocationName { get; set; }
}
