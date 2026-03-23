using System;
using System;

namespace FormfleksBaseApp.Domain.Entities.DynamicForms;

public class UserDelegationEntity
{
    public Guid Id { get; set; } = Guid.NewGuid();

    /// <summary>
    /// Yetkiyi devreden (örneğin izne çıkan) kullanıcının ID'si.
    /// </summary>
    public Guid DelegatorUserId { get; set; }

    /// <summary>
    /// Yetkiyi devralan (vekil atanan) kullanıcının ID'si.
    /// </summary>
    public Guid DelegateeUserId { get; set; }

    public DateTime StartDate { get; set; }
    public DateTime EndDate { get; set; }

    /// <summary>
    /// Manuel olarak erken sonlandırılırsa veya sistem tarafından devre dışı bırakılırsa false olur.
    /// </summary>
    public bool IsActive { get; set; } = true;

    /// <summary>
    /// Vekalet bırakma nedeni (Örn: Yıllık İzin, Raporlu).
    /// </summary>
    public string? Reason { get; set; }

    public DateTime CreatedAt { get; set; } = DateTime.UtcNow;
}
