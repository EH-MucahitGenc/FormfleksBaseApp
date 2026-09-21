using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyResultViewer : BaseEntity
{
    public Guid SurveyCampaignId { get; set; }
    public Guid UserId { get; set; }
    public FormfleksBaseApp.Domain.Enums.Surveys.SurveyViewerAccessLevel AccessLevel { get; set; } = FormfleksBaseApp.Domain.Enums.Surveys.SurveyViewerAccessLevel.AggregateOnly;

    // Audit and Time Constraints
    public Guid? GrantedByUserId { get; set; }
    public DateTime? GrantedAt { get; set; }
    public DateTime? ValidFrom { get; set; }
    public DateTime? ValidUntil { get; set; }
    public DateTime? RevokedAt { get; set; }
    public Guid? RevokedByUserId { get; set; }

    // Navigation properties
    public SurveyCampaign SurveyCampaign { get; set; } = null!;
}
