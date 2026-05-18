using MediatR;
using System;

namespace FormfleksBaseApp.Application.Features.DynamicForms.Commands.CancelRequest;

/// <summary>
/// Kullanıcının onay bekleyen veya henüz gönderilmiş olan kendi formunu iptal etmesini sağlayan komut.
/// </summary>
public sealed record CancelRequestCommand(Guid RequestId, Guid ActorUserId, string? Reason) : IRequest<bool>;
