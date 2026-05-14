using FormfleksBaseApp.DynamicForms.Business.Contracts.Reports;
using MediatR;
using System;
using System.Collections.Generic;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetHrFormDetails;

public sealed record GetHrFormDetailsQuery(
    Guid RequestorUserId,
    Guid FormTypeId,
    DateTime? StartDate,
    DateTime? EndDate
) : IRequest<List<HrFormDetailItemDto>>;
