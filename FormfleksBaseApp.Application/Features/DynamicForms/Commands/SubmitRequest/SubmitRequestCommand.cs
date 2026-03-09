using FormfleksBaseApp.DynamicForms.Business.Contracts;
using MediatR;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.SubmitRequest;

public sealed record SubmitRequestCommand(SubmitRequestDto Request) : IRequest<FormRequestResultDto>;
