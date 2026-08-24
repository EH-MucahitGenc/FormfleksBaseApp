using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyVersionSection : BaseEntity
{
    public Guid SurveyTemplateVersionId { get; set; }
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public int SortOrder { get; set; }

    // Navigation properties
    public SurveyTemplateVersion SurveyTemplateVersion { get; set; } = null!;
    public ICollection<SurveyVersionQuestion> Questions { get; set; } = new List<SurveyVersionQuestion>();
}
