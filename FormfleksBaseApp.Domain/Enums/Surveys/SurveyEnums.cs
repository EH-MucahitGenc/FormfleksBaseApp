namespace FormfleksBaseApp.Domain.Enums.Surveys;

public enum SurveyQuestionType : short
{
    ShortText = 1,
    LongText = 2,
    SingleChoice = 3,
    MultipleChoice = 4,
    YesNo = 5,
    Rating = 6,
    NPS = 7,
    Number = 8,
    Date = 9,
    Matrix = 10,
    File = 11,
    Info = 12
}

public enum SurveyCampaignStatus : short
{
    Draft = 1,
    Scheduled = 2,
    Publishing = 3,
    Published = 4,
    Closed = 5,
    Cancelled = 6,
    Archived = 7
}

public enum SurveyAssignmentStatus : short
{
    Pending = 1,
    Queued = 2,
    Sent = 3,
    Failed = 4,
    Started = 5,
    Completed = 6,
    Revoked = 7,
    Expired = 8
}
