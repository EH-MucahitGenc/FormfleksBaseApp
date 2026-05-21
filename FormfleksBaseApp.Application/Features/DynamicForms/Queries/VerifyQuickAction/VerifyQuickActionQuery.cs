using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Queries.VerifyQuickAction;

public sealed record VerifyQuickActionQuery(string Token) : IRequest<bool>;
