using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Common.Models;
using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Domain.Entities.Admin;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.DataAccess;
using FormfleksBaseApp.Infrastructure.Persistence;
using FormfleksBaseApp.Infrastructure.Services;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.DependencyInjection;

namespace FormfleksBaseApp.Tests.Infrastructure;

public sealed class ApprovalQueuedEmailPolicyTests
{
    [Theory]
    [InlineData(null, "ApprovalRequest", "GLOBAL.IK@example.com", true)]
    [InlineData(null, "ApprovalReminder", "GLOBAL.IK@example.com", true)]
    [InlineData(null, "ApprovalReminder", "qdms.ik@example.com", true)]
    [InlineData("2_AY_DENEME", "ApprovalRequest", "GLOBAL.IK@example.com", false)]
    [InlineData("6_AY_DENEME", "ApprovalReminder", "GLOBAL.IK@example.com", false)]
    [InlineData(null, "GlobalManagerInfo", "GLOBAL.IK@example.com", false)]
    public async Task QueuedApprovalEmail_FollowsGlobalIkException(
        string? systemUsageType, string messageType, string recipientAddress, bool expectedSuppression)
    {
        var dynamicOptions = new DbContextOptionsBuilder<DynamicFormsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        var appOptions = new DbContextOptionsBuilder<AppDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString()).Options;
        await using var dynamicDb = new DynamicFormsDbContext(dynamicOptions);
        await using var appDb = new AppDbContext(appOptions);

        var userId = Guid.NewGuid();
        var roleId = Guid.NewGuid();
        var formTypeId = Guid.NewGuid();
        var requestId = Guid.NewGuid();
        appDb.Users.Add(new AppUser
        {
            Id = userId, Email = "global.ik@example.com", AuthProvider = "Test",
            Active = true, CreatedAt = DateTime.UtcNow
        });
        dynamicDb.Roles.Add(new RoleEntity { Id = roleId, Code = "IK", Name = "İK", Active = true });
        dynamicDb.UserLocationRoles.Add(new UserLocationRoleEntity
        {
            Id = Guid.NewGuid(), UserId = userId, RoleId = roleId,
            IsGlobalManager = true, IsActive = true
        });
        dynamicDb.QdmsPersoneller.Add(new QdmsPersonelAktarim
        {
            Id = Guid.NewGuid(), Sirket = "TEST", Sicil_No = "IK-1",
            Email = "qdms.ik@example.com", LinkedUserId = userId, IsActive = true
        });
        dynamicDb.FormTypes.Add(new FormTypeEntity
        {
            Id = formTypeId, Code = "FORM", Name = "Form", Active = true,
            SystemUsageType = systemUsageType, CreatedByUserId = userId, CreatedAt = DateTime.UtcNow
        });
        dynamicDb.FormRequests.Add(new FormRequestEntity
        {
            Id = requestId, FormTypeId = formTypeId, RequestNo = "REQ-1",
            RequestorUserId = userId, CreatedAt = DateTime.UtcNow, Status = 3
        });
        await appDb.SaveChangesAsync();
        await dynamicDb.SaveChangesAsync();

        await using var provider = new ServiceCollection()
            .AddSingleton<IDynamicFormsDbContext>(dynamicDb)
            .AddSingleton(appDb)
            .BuildServiceProvider();
        var policy = new ApprovalQueuedEmailPolicy(provider.GetRequiredService<IServiceScopeFactory>());
        var message = new EmailMessage
        {
            MessageType = messageType, ReferenceType = "FormRequest",
            ReferenceId = requestId.ToString(), ToAddresses = [recipientAddress]
        };

        Assert.Equal(expectedSuppression, await policy.ShouldSuppressAsync(message, CancellationToken.None));
    }
}
