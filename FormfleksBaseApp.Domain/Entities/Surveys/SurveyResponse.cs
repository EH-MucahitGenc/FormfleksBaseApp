using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyResponse : BaseEntity
{
    public Guid SurveyCampaignId { get; set; }
    
    // Null for anonymous surveys to prevent correlation
    public Guid? SurveyAssignmentId { get; set; }
    public Guid? UserId { get; set; }
    
    public DateTime StartedAt { get; set; }
    public DateTime SubmittedAt { get; set; }
    
    // Receipt code for anonymous surveys to prove participation without revealing identity
    public string? ReceiptCode { get; set; }

    // Navigation properties
    public SurveyCampaign SurveyCampaign { get; set; } = null!;
    public SurveyAssignment? SurveyAssignment { get; set; }
    public ICollection<SurveyAnswer> Answers { get; set; } = new List<SurveyAnswer>();
}
