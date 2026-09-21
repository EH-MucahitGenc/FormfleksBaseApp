using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyResponse : BaseEntity
{
    public Guid SurveyCampaignId { get; set; }
    
    // Null for anonymous surveys to prevent correlation
    public Guid? SurveyAssignmentId { get; set; }
    
    public DateTime StartedAt { get; set; }
    public DateTime SubmittedAt { get; set; }
    
    // Receipt code for anonymous surveys to prove participation without revealing identity
    public string? ReceiptCode { get; set; }

    // Privacy-preserving reporting dimensions; no participant identity is stored here.
    public string? CompanySnapshot { get; set; }
    public string? LocationSnapshot { get; set; }
    public string? DepartmentSnapshot { get; set; }
    public string? JobTitleSnapshot { get; set; }
    public string? PersonnelGroupSnapshot { get; set; }

    // Navigation properties
    public SurveyCampaign SurveyCampaign { get; set; } = null!;
    public SurveyAssignment? SurveyAssignment { get; set; }
    public ICollection<SurveyAnswer> Answers { get; set; } = new List<SurveyAnswer>();
}
