using System;
using MediatR;

namespace FormfleksBaseApp.Application.Features.Admin.Commands.SyncQdmsPersonel;

public class SyncQdmsPersonelResponseDto
{
    public bool Success { get; set; }
    public string Message { get; set; } = string.Empty;
}

public class SyncQdmsPersonelCommand : IRequest<SyncQdmsPersonelResponseDto>
{
    public Guid ActorUserId { get; set; }
}
