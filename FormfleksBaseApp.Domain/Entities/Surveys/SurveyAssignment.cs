using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Domain.Enums.Surveys;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyAssignment : BaseEntity
{
    public Guid SurveyCampaignId { get; set; }
    // Always references the active AppUser selected when the campaign is published.
    public Guid UserId { get; set; }
    public Guid Token { get; set; } = Guid.NewGuid();
    public SurveyAssignmentStatus Status { get; set; }
    public DateTime? StartedAt { get; set; }
    public DateTime? EmailSentAt { get; set; }
    public DateTime? CompletedAt { get; set; }

    // Immutable reporting dimensions captured at assignment time.
    public string ParticipantDisplayName { get; set; } = string.Empty;
    public string ParticipantEmail { get; set; } = string.Empty;
    public string? CompanySnapshot { get; set; }
    public string? LocationSnapshot { get; set; }
    public string? DepartmentSnapshot { get; set; }
    public string? JobTitleSnapshot { get; set; }
    public string? PersonnelGroupSnapshot { get; set; }
    public DateTime SnapshotAt { get; set; }
    public string SnapshotSource { get; set; } = "AppUser";

    // Email Delivery Tracking
    public SurveyEmailDeliveryStatus EmailDeliveryStatus { get; set; }
    public int EmailRetryCount { get; set; }
    public DateTime? LastEmailAttemptAt { get; set; }
    public string? EmailErrorMessage { get; set; }

    // Navigation properties
    public SurveyCampaign SurveyCampaign { get; set; } = null!;
}
