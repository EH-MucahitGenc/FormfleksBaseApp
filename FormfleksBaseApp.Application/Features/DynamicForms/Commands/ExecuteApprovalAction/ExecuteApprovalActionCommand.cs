using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.ExecuteApprovalAction;

public sealed record ExecuteApprovalActionCommand(ApprovalActionRequestDto Request) : IRequest<ApprovalActionResponseDto>;
