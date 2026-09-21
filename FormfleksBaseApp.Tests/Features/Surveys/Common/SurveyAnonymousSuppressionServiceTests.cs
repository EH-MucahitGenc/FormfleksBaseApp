using FormfleksBaseApp.Application.Features.Surveys.Common;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignResults;
using FormfleksBaseApp.Application.Features.Surveys.Campaigns.Queries.GetCampaignSegments;
using System.Collections.Generic;
using Xunit;

namespace FormfleksBaseApp.Tests.Features.Surveys.Common;

public class SurveyAnonymousSuppressionServiceTests
{
    private readonly SurveyAnonymousSuppressionService _sut;

    public SurveyAnonymousSuppressionServiceTests()
    {
        _sut = new SurveyAnonymousSuppressionService();
    }

    [Theory]
    [InlineData(1, true, true)]
    [InlineData(9, true, true)]
    [InlineData(10, true, false)]
    [InlineData(11, true, false)]
    [InlineData(1, false, false)]
    [InlineData(0, true, false)]
    public void ShouldSuppress_ReturnsExpectedResult(int count, bool isAnonymous, bool expected)
    {
        // Act
        var result = _sut.ShouldSuppress(count, isAnonymous);

        // Assert
        Assert.Equal(expected, result);
    }

    [Fact]
    public void SuppressTiming_ClearsTimingData()
    {
        // Arrange
        var timing = new ResponseTimingDto
        {
            FirstResponseAt = System.DateTime.UtcNow.AddDays(-1),
            LastResponseAt = System.DateTime.UtcNow,
            AverageCompletionSeconds = 120.5,
            MedianCompletionSeconds = 110.0
        };

        // Act
        _sut.SuppressTiming(timing);

        // Assert
        Assert.Null(timing.FirstResponseAt);
        Assert.Null(timing.LastResponseAt);
        Assert.Null(timing.AverageCompletionSeconds);
        Assert.Null(timing.MedianCompletionSeconds);
    }
}
