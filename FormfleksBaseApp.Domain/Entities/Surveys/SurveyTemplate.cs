using FormfleksBaseApp.Domain.Entities;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyTemplate : BaseEntity
{
    public string Title { get; set; } = string.Empty;
    public string? Description { get; set; }
    public bool DefaultIsAnonymous { get; set; } = false;

    // Navigation properties
    public ICollection<SurveyTemplateVersion> Versions { get; set; } = new List<SurveyTemplateVersion>();
}
