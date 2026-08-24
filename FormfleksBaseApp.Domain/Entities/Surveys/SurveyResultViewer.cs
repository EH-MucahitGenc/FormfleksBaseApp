using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyResultViewer : BaseEntity
{
    public Guid SurveyCampaignId { get; set; }
    public Guid UserId { get; set; }

    // Navigation properties
    public SurveyCampaign SurveyCampaign { get; set; } = null!;
}
