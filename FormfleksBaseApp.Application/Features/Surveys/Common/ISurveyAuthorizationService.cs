using System;
using System.Threading;
using System.Threading.Tasks;
using FormfleksBaseApp.Domain.Enums.Surveys;

namespace FormfleksBaseApp.Application.Features.Surveys.Common;

public interface ISurveyAuthorizationService
{
    Task<bool> IsActiveUserAsync(Guid userId, CancellationToken cancellationToken = default);
    /// <summary>
    /// Belirtilen kullanıcı için sistem genelindeki anket yetkilerini doğrular. (Örn: DesignTemplate)
    /// </summary>
    Task<bool> HasGlobalPermissionAsync(Guid userId, SurveyAction action, CancellationToken cancellationToken = default);

    /// <summary>
    /// Belirtilen kullanıcı için belirli bir kampanya üzerindeki yetkileri doğrular.
    /// Sahiplik, global adminlik ve kampanya bazlı izleyici yetkilerini kontrol eder.
    /// </summary>
    Task<bool> HasCampaignPermissionAsync(Guid userId, Guid campaignId, SurveyAction action, CancellationToken cancellationToken = default);

    /// <summary>
    /// Yetki yoksa fırlatılacak standart metot.
    /// </summary>
    Task EnsureCampaignPermissionAsync(Guid userId, Guid campaignId, SurveyAction action, CancellationToken cancellationToken = default);
}
