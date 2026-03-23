using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;
using Dapper;
using FormfleksBaseApp.Application.Integrations.Oracle;
using FormfleksBaseApp.Application.Integrations.Oracle.QdmsPersonel;

namespace FormfleksBaseApp.Infrastructure.Integrations.Oracle.QdmsPersonel;

public sealed class QdmsPersonelAktarimRepository : IQdmsPersonelAktarimRepository
{
    private readonly IOracleConnectionFactory _factory;

    public QdmsPersonelAktarimRepository(IOracleConnectionFactory factory)
        => _factory = factory;

    public async Task<List<QdmsPersonelAktarimOracleDto>> GetAllActivePersonnelAsync(CancellationToken ct)
    {
        const string sql = @"
SELECT Sirket, isyeri_kodu, Isyeri_Tanimi, grup_kodu, grup_kodu_aciklama, 
       Sicil_No, Adi, Soyadi, Email, Pozisyon_Kodu, Pozisyon_Aciklamasi, 
       Ust_Pozisyon_Kodu, Departman_Kodu, Departman_Adi
FROM ERKURT_QDMS_PERSONEL_AKTARIM";

        using var conn = _factory.Create();
        try
        {
            conn.Open();

            var cmd = new CommandDefinition(sql, cancellationToken: ct);
            var res = await conn.QueryAsync<QdmsPersonelAktarimOracleDto>(cmd);
            return res.AsList();
        }
        finally
        {
            if (conn.State == System.Data.ConnectionState.Open)
            {
                conn.Close();
            }
        }
    }
}
