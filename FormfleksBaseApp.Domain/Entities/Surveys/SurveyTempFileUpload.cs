using FormfleksBaseApp.Domain.Entities;
using System;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyTempFileUpload : BaseEntity
{
    public Guid Token { get; set; }
    public Guid QuestionId { get; set; }
    public string StorageKey { get; set; } = string.Empty;
    public string OriginalFileName { get; set; } = string.Empty;
    public string ContentType { get; set; } = string.Empty;
    public long FileSize { get; set; }
    public DateTime ExpiresAt { get; set; }
}
