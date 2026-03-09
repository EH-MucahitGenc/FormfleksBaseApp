using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetTemplates;

public sealed record GetTemplatesQuery : IRequest<IReadOnlyList<FormTemplateSummaryDto>>;
