using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyAnswerFile : BaseEntity
{
    public Guid SurveyAnswerId { get; set; }
    public string FileName { get; set; } = string.Empty;
    public string FilePath { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }

    // Navigation properties
    public SurveyAnswer SurveyAnswer { get; set; } = null!;
}
