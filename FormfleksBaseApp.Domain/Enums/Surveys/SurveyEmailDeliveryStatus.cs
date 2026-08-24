namespace FormfleksBaseApp.Domain.Enums.Surveys;

public enum SurveyEmailDeliveryStatus
{
    Queued = 0,
    Processing = 1,
    Delivered = 2,
    Failed = 3,
    Retry = 4
}
