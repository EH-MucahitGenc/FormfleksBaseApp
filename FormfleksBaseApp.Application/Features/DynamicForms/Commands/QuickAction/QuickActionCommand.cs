using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.QuickAction;

public sealed record QuickActionCommand(
    string Token,
    string ActionType, // "approve", "reject", "return"
    string? Comment
) : IRequest<bool>;
