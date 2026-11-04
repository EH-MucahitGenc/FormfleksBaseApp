using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Common.Models;
using FormfleksBaseApp.Application.Features.DynamicForms;
using FormfleksBaseApp.Domain.Constants;
using FormfleksBaseApp.Infrastructure.Persistence;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace FormfleksBaseApp.Infrastructure.Services;

/// <summary>
/// Checks old approval emails already in the outbox before SMTP delivery.
/// New approval emails are filtered when they are created.
/// </summary>
public sealed class ApprovalQueuedEmailPolicy
{
    private readonly IServiceScopeFactory _scopeFactory;

    public ApprovalQueuedEmailPolicy(IServiceScopeFactory scopeFactory) => _scopeFactory = scopeFactory;

    public async Task<bool> ShouldSuppressAsync(EmailMessage message, CancellationToken cancellationToken)
    {
        if (message.MessageType is not ("ApprovalRequest" or "ApprovalReminder") ||
            message.ReferenceType != "FormRequest" ||
            !Guid.TryParse(message.ReferenceId, out var requestId) ||
            message.ToAddresses.Count != 1 ||
            message.CcAddresses.Count != 0 ||
            message.BccAddresses.Count != 0)
            return false;

        await using var scope = _scopeFactory.CreateAsyncScope();
        var dynamicFormsDb = scope.ServiceProvider.GetRequiredService<IDynamicFormsDbContext>();
        var appDb = scope.ServiceProvider.GetRequiredService<AppDbContext>();

        var formTypeId = await dynamicFormsDb.FormRequests.AsNoTracking()
            .Where(request => request.Id == requestId)
            .Select(request => (Guid?)request.FormTypeId)
            .SingleOrDefaultAsync(cancellationToken);
        if (!formTypeId.HasValue)
            return false;

        var systemUsageType = await dynamicFormsDb.FormTypes.AsNoTracking()
            .Where(formType => formType.Id == formTypeId.Value)
            .Select(formType => formType.SystemUsageType)
            .SingleOrDefaultAsync(cancellationToken);
        if (ProbationFormConstants.IsProbationForm(systemUsageType))
            return false;

        var recipientEmail = message.ToAddresses[0].Trim().ToLowerInvariant();
        var userIds = await appDb.Users.AsNoTracking()
            .Where(user => user.Email.ToLower() == recipientEmail)
            .Select(user => user.Id)
            .ToListAsync(cancellationToken);
        userIds.AddRange(await dynamicFormsDb.QdmsPersoneller.AsNoTracking()
            .Where(person => person.IsActive && person.Email != null &&
                             person.Email.ToLower() == recipientEmail && person.LinkedUserId.HasValue)
            .Select(person => person.LinkedUserId!.Value)
            .ToListAsync(cancellationToken));

        var suppressed = await ApprovalEmailRecipientPolicy.GetSuppressedGlobalIkUserIdsAsync(
            dynamicFormsDb, systemUsageType, userIds, cancellationToken);
        return suppressed.Count > 0;
    }
}
