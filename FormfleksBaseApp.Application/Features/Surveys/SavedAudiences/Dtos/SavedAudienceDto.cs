using System;
using FormfleksBaseApp.Application.Features.Surveys.Common;

namespace FormfleksBaseApp.Application.Features.Surveys.SavedAudiences.Dtos;

public class SavedAudienceDto
{
    public Guid Id { get; set; }
    public string Name { get; set; } = string.Empty;
    public string? Description { get; set; }
    public AudienceFilter AudienceDefinition { get; set; } = new();
    public DateTime CreatedAt { get; set; }
    public Guid? OwnerUserId { get; set; }
}
