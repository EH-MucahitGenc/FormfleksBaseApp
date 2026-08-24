using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Domain.Enums.Surveys;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyCampaign : BaseEntity
{
    public Guid SurveyTemplateVersionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsAnonymous { get; set; }
    public SurveyCampaignStatus Status { get; set; }
    public DateTime? StartDate { get; set; }
    public DateTime? EndDate { get; set; }
    public string? EmailSubject { get; set; }
    public string? EmailBodyTemplate { get; set; }

    // Navigation properties
    public SurveyTemplateVersion SurveyTemplateVersion { get; set; } = null!;
    public ICollection<SurveyAssignment> Assignments { get; set; } = new List<SurveyAssignment>();
    public ICollection<SurveyResponse> Responses { get; set; } = new List<SurveyResponse>();
    public ICollection<SurveyResultViewer> ResultViewers { get; set; } = new List<SurveyResultViewer>();
}
