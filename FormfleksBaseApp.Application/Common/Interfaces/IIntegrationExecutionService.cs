using System;
using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Common.Interfaces;

public interface IIntegrationExecutionService
{
    /// <summary>
    /// Yapılandırılmış bir dış entegrasyon sorgusunu (IntegrationQuery) çalıştırır ve 
    /// eşleştirilmiş kolon/değer sözlüğünü (Dictionary) döner.
    /// </summary>
    /// <param name="queryId">Çalıştırılacak entegrasyon sorgusunun ID'si.</param>
    /// <param name="parameters">Sorguya dışarıdan/istemciden gönderilen parametrelerin anahtar-değer çiftleri.</param>
    /// <param name="ct">İptal tokeni.</param>
    /// <returns>Sorgu sonucundaki ilk satırı kolon isimleriyle birlikte sözlük olarak döner.</returns>
    Task<IDictionary<string, object>?> ExecuteQueryAsync(Guid queryId, IDictionary<string, string> parameters, CancellationToken ct);
}
