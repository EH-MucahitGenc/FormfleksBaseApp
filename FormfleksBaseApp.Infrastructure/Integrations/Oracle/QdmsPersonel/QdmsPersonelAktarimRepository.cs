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
        using var conn = _factory.Create();
        
        try {
            using var reader = await conn.ExecuteReaderAsync("SELECT * FROM ERKURT_QDMS_PERSONEL_AKTARIM WHERE ROWNUM = 1");
            var columns = new System.Collections.Generic.List<string>();
            for (int i = 0; i < reader.FieldCount; i++) { columns.Add(reader.GetName(i)); }
            System.IO.File.WriteAllText(@"C:\ErkurtProjeler\FormfleksBaseApp\oracle_columns.txt", string.Join(", ", columns));
        } catch { }

        const string sql = @"
SELECT SIRKET, ISYERI_KODU, ISYERI_TANIMI, GRUP_KODU, GRUP_KODU_ACIKLAMA, 
       SICIL_NO, ADI, SOYADI, EMAIL, POZISYON_KODU, POZISYON_ACIKLAMASI, 
       UST_POZISYON_KODU, DEPARTMAN_KODU, DEPARTMAN_ADI,
       BASLAMA_TARIHI, DOGUM_TARIHI, DENEME2AY_TRH, DENEME6AY_TRH
FROM ERKURT_QDMS_PERSONEL_AKTARIM";

        try
        {
            conn.Open();

            var cmd = new Dapper.CommandDefinition(sql, cancellationToken: ct);
            var oracleData = await conn.QueryAsync<QdmsPersonelAktarimOracleDto>(cmd);
            return oracleData.AsList();
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
