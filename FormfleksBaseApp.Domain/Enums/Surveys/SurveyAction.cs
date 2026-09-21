namespace FormfleksBaseApp.Domain.Enums.Surveys;

public enum SurveyAction
{
    // Genel işlemler
    DesignTemplate,
    PublishCampaign,

    // Kampanya bazlı işlemler
    ManageCampaign = 3,
    ManageAudience,
    ManageDelivery,
    ManageCampaignAccess,
    
    // Raporlama ve Sonuçlar
    ViewAggregateResults,
    ViewTextAnswers,
    ViewIdentifiedResponses,
    ExportAggregateResults,
    ExportIdentifiedResponses,
    ViewResponseFiles
}
