using FormfleksBaseApp.DynamicForms.Business.Contracts.Reports;
using MediatR;
using System;
using System.Collections.Generic;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetHrSummaryReport;

public sealed record GetHrSummaryReportQuery(
    DateTime? StartDate,
    DateTime? EndDate,
    Guid? RequestorUserId,
    string? Department,
    string? Location
) : IRequest<List<HrSummaryReportDto>>;
