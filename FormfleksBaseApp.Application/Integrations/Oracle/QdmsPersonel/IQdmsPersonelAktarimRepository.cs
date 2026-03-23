using System.Collections.Generic;
using System.Threading;
using System.Threading.Tasks;

namespace FormfleksBaseApp.Application.Integrations.Oracle.QdmsPersonel;

public interface IQdmsPersonelAktarimRepository
{
    Task<List<QdmsPersonelAktarimOracleDto>> GetAllActivePersonnelAsync(CancellationToken ct);
}
