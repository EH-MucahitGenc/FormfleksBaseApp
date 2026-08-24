using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyQuestionOption : BaseEntity
{
    public Guid SurveyVersionQuestionId { get; set; }
    public string Label { get; set; } = string.Empty;
    public string? Value { get; set; }
    public int SortOrder { get; set; }
    public bool IsOtherOption { get; set; }

    // Navigation properties
    public SurveyVersionQuestion SurveyVersionQuestion { get; set; } = null!;
}
