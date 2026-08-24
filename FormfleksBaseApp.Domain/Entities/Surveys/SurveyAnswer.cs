using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyAnswer : BaseEntity
{
    public Guid SurveyResponseId { get; set; }
    public Guid SurveyVersionQuestionId { get; set; }
    
    public string? ValueText { get; set; }
    public decimal? ValueNumber { get; set; }
    public DateTime? ValueDate { get; set; }
    public string? ValueJson { get; set; }

    // Navigation properties
    public SurveyResponse SurveyResponse { get; set; } = null!;
    public SurveyVersionQuestion SurveyVersionQuestion { get; set; } = null!;
    public ICollection<SurveyAnswerFile> Files { get; set; } = new List<SurveyAnswerFile>();
}
