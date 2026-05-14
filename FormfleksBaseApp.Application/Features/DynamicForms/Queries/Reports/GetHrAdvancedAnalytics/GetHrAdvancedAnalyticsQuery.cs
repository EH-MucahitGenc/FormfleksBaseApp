using FormfleksBaseApp.DynamicForms.Business.Contracts.Reports;
using MediatR;
using System;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetHrAdvancedAnalytics;

public sealed record GetHrAdvancedAnalyticsQuery(
    DateTime? StartDate,
    DateTime? EndDate,
    Guid? RequestorUserId,
    string? Department
) : IRequest<HrAdvancedAnalyticsDto>;
