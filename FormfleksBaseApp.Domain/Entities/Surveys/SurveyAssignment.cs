using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Domain.Enums.Surveys;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyAssignment : BaseEntity
{
    public Guid SurveyCampaignId { get; set; }
    public Guid UserId { get; set; } // Can link to AppUser or QdmsPersonelAktarim depending on architecture
    public Guid Token { get; set; } = Guid.NewGuid();
    public SurveyAssignmentStatus Status { get; set; }
    public DateTime? EmailSentAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Email Delivery Tracking
    public SurveyEmailDeliveryStatus EmailDeliveryStatus { get; set; }
    public int EmailRetryCount { get; set; }
    public DateTime? LastEmailAttemptAt { get; set; }
    public string? EmailErrorMessage { get; set; }

    // Navigation properties
    public SurveyCampaign SurveyCampaign { get; set; } = null!;
}
