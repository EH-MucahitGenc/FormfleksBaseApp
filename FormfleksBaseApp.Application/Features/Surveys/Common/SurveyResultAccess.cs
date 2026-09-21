using System.Linq.Expressions;
using FormfleksBaseApp.Domain.Entities.Surveys;

namespace FormfleksBaseApp.Application.Features.Surveys.Common;

public static class SurveyResultAccess
{
    public static Expression<Func<SurveyCampaign, bool>> VisibleTo(Guid userId, DateTime now) =>
        c => c.ResultViewers.Any(v => v.UserId == userId && v.Active &&
            (v.RevokedAt == null || v.RevokedAt > now) &&
            (v.ValidFrom == null || v.ValidFrom <= now) &&
            (v.ValidUntil == null || v.ValidUntil >= now)) ||
            ((c.OwnerUserId == userId || c.CreatedByUserId == userId) &&
             !c.ResultViewers.Any(v => v.UserId == userId));
}
