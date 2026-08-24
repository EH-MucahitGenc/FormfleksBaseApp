using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyTemplateVersion : BaseEntity
{
    public Guid SurveyTemplateId { get; set; }
    public int VersionNumber { get; set; }
    public bool IsPublished { get; set; }
    public DateTime? PublishedAt { get; set; }
    public Guid? PublishedByUserId { get; set; }
    public string? Notes { get; set; }

    // Navigation properties
    public SurveyTemplate SurveyTemplate { get; set; } = null!;
    public ICollection<SurveyVersionSection> Sections { get; set; } = new List<SurveyVersionSection>();
    public ICollection<SurveyCampaign> Campaigns { get; set; } = new List<SurveyCampaign>();
}
