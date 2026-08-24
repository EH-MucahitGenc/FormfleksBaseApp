using System;

namespace FormfleksBaseApp.Domain.Entities.Surveys;

public class SurveyParticipationGuard
{
    public Guid Token { get; set; }
    public DateTime CompletedAt { get; set; }
}
