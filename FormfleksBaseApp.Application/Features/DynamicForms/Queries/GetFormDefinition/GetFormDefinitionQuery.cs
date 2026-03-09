using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetFormDefinition;

public sealed record GetFormDefinitionQuery(string FormCode) : IRequest<FormDefinitionDto?>;
