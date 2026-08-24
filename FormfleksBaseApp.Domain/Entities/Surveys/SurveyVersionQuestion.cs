using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Domain.Enums.Surveys;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyVersionQuestion : BaseEntity
{
    public Guid SurveyVersionSectionId { get; set; }
    public SurveyQuestionType QuestionType { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool IsRequired { get; set; }
    public int SortOrder { get; set; }
    
    // JSON fields for settings and logic
    public string? SettingsJson { get; set; }
    public string? VisibilityRuleJson { get; set; }

    // Navigation properties
    public SurveyVersionSection SurveyVersionSection { get; set; } = null!;
    public ICollection<SurveyQuestionOption> Options { get; set; } = new List<SurveyQuestionOption>();
}
