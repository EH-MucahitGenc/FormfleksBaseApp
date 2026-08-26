using System;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SavedAudience : BaseEntity
{
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public string AudienceDefinitionJson { get; set; } = string.Empty; // Holds AudienceFilter serialization
    
    // Ownership
    public Guid? OwnerUserId { get; set; }
}
