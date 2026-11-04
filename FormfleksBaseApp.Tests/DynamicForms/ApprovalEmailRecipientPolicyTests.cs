using FormfleksBaseApp.Application.Features.DynamicForms;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetPendingApprovals;
using FormfleksBaseApp.Domain.Entities.Admin;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.DataAccess;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FormfleksBaseApp.Tests.DynamicForms;

public sealed class ApprovalEmailRecipientPolicyTests
{
    [Fact]
    public async Task NonProbation_SuppressesOnlyActiveGlobalIk_WhileApprovalRemainsVisible()
    {
        await using var context = CreateContext();
        var globalIkUserId = Guid.NewGuid();
        var branchIkUserId = Guid.NewGuid();
        var globalOtherRoleUserId = Guid.NewGuid();
        var inactiveGlobalIkUserId = Guid.NewGuid();
        var requestorUserId = Guid.NewGuid();
        var ikRoleId = Guid.NewGuid();
        var otherRoleId = Guid.NewGuid();
        var formTypeId = Guid.NewGuid();
        var workflowId = Guid.NewGuid();
        var stepId = Guid.NewGuid();
        var requestId = Guid.NewGuid();
        var approvalId = Guid.NewGuid();

        context.Roles.AddRange(
            new RoleEntity { Id = ikRoleId, Code = "IK", Name = "İK", Active = true },
            new RoleEntity { Id = otherRoleId, Code = "IT", Name = "IT", Active = true });
        context.UserLocationRoles.AddRange(
            new UserLocationRoleEntity { Id = Guid.NewGuid(), UserId = globalIkUserId, RoleId = ikRoleId, IsGlobalManager = true, IsActive = true },
            new UserLocationRoleEntity { Id = Guid.NewGuid(), UserId = branchIkUserId, RoleId = ikRoleId, LocationName = "Bursa", IsGlobalManager = false, IsActive = true },
            new UserLocationRoleEntity { Id = Guid.NewGuid(), UserId = globalOtherRoleUserId, RoleId = otherRoleId, IsGlobalManager = true, IsActive = true },
            new UserLocationRoleEntity { Id = Guid.NewGuid(), UserId = inactiveGlobalIkUserId, RoleId = ikRoleId, IsGlobalManager = true, IsActive = false });
        context.FormTypes.Add(new FormTypeEntity
        {
            Id = formTypeId, Code = "GENERAL", Name = "Genel Form", Active = true,
            CreatedByUserId = requestorUserId, CreatedAt = DateTime.UtcNow
        });
        context.WorkflowDefinitions.Add(new WorkflowDefinitionEntity
        {
            Id = workflowId, FormTypeId = formTypeId, VersionNo = 1, IsActive = true
        });
        context.WorkflowSteps.Add(new WorkflowStepEntity
        {
            Id = stepId, WorkflowDefinitionId = workflowId, StepNo = 1, Name = "İK Onayı",
            AssigneeType = (short)WorkflowAssigneeType.LocationBasedRole,
            TargetLocationRoleId = ikRoleId, IsGlobalManagerInfoOnly = true
        });
        context.QdmsPersoneller.Add(new QdmsPersonelAktarim
        {
            Id = Guid.NewGuid(), Sirket = "TEST", Sicil_No = "REQ", Adi = "Talep", Soyadi = "Sahibi",
            Isyeri_Tanimi = "Bursa", LinkedUserId = requestorUserId, IsActive = true
        });
        context.FormRequests.Add(new FormRequestEntity
        {
            Id = requestId, FormTypeId = formTypeId, RequestNo = "TEST-1",
            RequestorUserId = requestorUserId, Status = (short)FormRequestStatus.InApproval,
            CurrentStepNo = 1, CreatedAt = DateTime.UtcNow
        });
        context.FormRequestApprovals.Add(new FormRequestApprovalEntity
        {
            Id = approvalId, RequestId = requestId, StepNo = 1, WorkflowStepId = stepId,
            Status = (short)ApprovalStatus.Pending
        });
        await context.SaveChangesAsync();

        var recipients = new[] { globalIkUserId, branchIkUserId, globalOtherRoleUserId, inactiveGlobalIkUserId };
        var suppressed = await ApprovalEmailRecipientPolicy.GetSuppressedGlobalIkUserIdsAsync(
            context, null, recipients, CancellationToken.None);
        Assert.Equal(globalIkUserId, Assert.Single(suppressed));

        var pending = await new GetPendingApprovalsQueryHandler(
            context, NullLogger<GetPendingApprovalsQueryHandler>.Instance,
            Mock.Of<FormfleksBaseApp.Application.Auth.Interfaces.IUserRepository>())
            .Handle(new GetPendingApprovalsQuery(globalIkUserId), CancellationToken.None);
        Assert.Equal(approvalId, Assert.Single(pending).ApprovalId);
    }

    [Theory]
    [InlineData("2_AY_DENEME")]
    [InlineData("6_AY_DENEME")]
    public async Task ProbationForms_KeepGlobalIkApprovalEmail(string systemUsageType)
    {
        await using var context = CreateContext();
        var globalIkUserId = Guid.NewGuid();
        var ikRoleId = Guid.NewGuid();
        context.Roles.Add(new RoleEntity { Id = ikRoleId, Code = "IK", Name = "İK", Active = true });
        context.UserLocationRoles.Add(new UserLocationRoleEntity
        {
            Id = Guid.NewGuid(), UserId = globalIkUserId, RoleId = ikRoleId,
            IsGlobalManager = true, IsActive = true
        });
        await context.SaveChangesAsync();

        var suppressed = await ApprovalEmailRecipientPolicy.GetSuppressedGlobalIkUserIdsAsync(
            context, systemUsageType, [globalIkUserId], CancellationToken.None);
        Assert.Empty(suppressed);
    }

    private static DynamicFormsDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<DynamicFormsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new DynamicFormsDbContext(options);
    }
}
