using FormfleksBaseApp.Application.Auth.Interfaces;
using FormfleksBaseApp.Application.Features.DynamicForms;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetPendingApprovals;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetRequestDetailed;
using FormfleksBaseApp.Domain.Entities.Admin;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.DataAccess;
using FormfleksBaseApp.DynamicForms.Business.Queries.GetRequestDetailed;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FormfleksBaseApp.Tests.DynamicForms;

public sealed class FormRequestApprovalLocationTests
{
    [Fact]
    public async Task MissingRequestorPersonnel_UsesFirstManualApproverAndKeepsBranchApprovalVisible()
    {
        await using var db = CreateContext();
        var (request, manualApproverId, branchUserId, otherBranchUserId, globalUserId) = SeedWorkflow(db);
        await db.SaveChangesAsync();

        request.ApprovalLocationName = await FormRequestApprovalLocation.ResolveAsync(db, request, CancellationToken.None);
        Assert.Equal("Gölcük 1045", request.ApprovalLocationName);
        await db.SaveChangesAsync();

        var person = await db.QdmsPersoneller.SingleAsync(p => p.LinkedUserId == manualApproverId);
        person.Isyeri_Tanimi = "Başka Şube";
        await db.SaveChangesAsync();
        Assert.Equal("Gölcük 1045", await FormRequestApprovalLocation.ResolveAsync(db, request, CancellationToken.None));

        var handler = new GetPendingApprovalsQueryHandler(
            db, NullLogger<GetPendingApprovalsQueryHandler>.Instance, Mock.Of<IUserRepository>());
        var branchItems = await handler.Handle(new GetPendingApprovalsQuery(branchUserId), CancellationToken.None);
        Assert.Equal(request.Id, Assert.Single(branchItems).RequestId);
        Assert.Empty(await handler.Handle(new GetPendingApprovalsQuery(otherBranchUserId), CancellationToken.None));
        Assert.Equal(request.Id, Assert.Single(await handler.Handle(
            new GetPendingApprovalsQuery(globalUserId), CancellationToken.None)).RequestId);

        var detailsHandler = new GetRequestDetailedQueryHandler(db, Mock.Of<IUserRepository>());
        Assert.NotNull(await detailsHandler.Handle(
            new GetRequestDetailedQuery(request.Id, branchUserId), CancellationToken.None));
        Assert.Null(await detailsHandler.Handle(
            new GetRequestDetailedQuery(request.Id, otherBranchUserId), CancellationToken.None));
    }

    [Fact]
    public async Task RequestorLocationTakesPriorityOverManualApprover()
    {
        await using var db = CreateContext();
        var (request, _, _, _, _) = SeedWorkflow(db);
        db.QdmsPersoneller.Add(NewPerson(request.RequestorUserId, "Bursa"));
        await db.SaveChangesAsync();

        Assert.Equal("Bursa", await FormRequestApprovalLocation.ResolveAsync(db, request, CancellationToken.None));
    }

    [Fact]
    public async Task ApprovedFirstStepSuppliesLocationWhenNoManualAssignmentExists()
    {
        await using var db = CreateContext();
        var (request, manualApproverId, _, _, _) = SeedWorkflow(db);
        await db.SaveChangesAsync();
        db.FormRequestManualAssignments.RemoveRange(db.FormRequestManualAssignments);
        var firstApproval = await db.FormRequestApprovals.SingleAsync(a => a.StepNo == 1);
        firstApproval.ActionByUserId = manualApproverId;
        firstApproval.Status = (short)ApprovalStatus.Approved;
        await db.SaveChangesAsync();

        Assert.Equal("Gölcük 1045", await FormRequestApprovalLocation.ResolveAsync(db, request, CancellationToken.None));
    }

    private static (FormRequestEntity Request, Guid ManualApproverId, Guid BranchUserId,
        Guid OtherBranchUserId, Guid GlobalUserId) SeedWorkflow(DynamicFormsDbContext db)
    {
        var requestorId = Guid.NewGuid();
        var manualApproverId = Guid.NewGuid();
        var branchUserId = Guid.NewGuid();
        var otherBranchUserId = Guid.NewGuid();
        var globalUserId = Guid.NewGuid();
        var formTypeId = Guid.NewGuid();
        var workflowId = Guid.NewGuid();
        var firstStepId = Guid.NewGuid();
        var locationStepId = Guid.NewGuid();
        var roleId = Guid.NewGuid();
        var request = new FormRequestEntity
        {
            Id = Guid.NewGuid(), FormTypeId = formTypeId, RequestorUserId = requestorId,
            RequestNo = "REQ-TEST-LOCATION", Status = (short)FormRequestStatus.InApproval,
            CurrentStepNo = 2, CreatedAt = DateTime.UtcNow
        };
        db.FormTypes.Add(new FormTypeEntity
        {
            Id = formTypeId, Code = "GENERAL", Name = "Genel Form", Active = true,
            CreatedByUserId = requestorId, CreatedAt = DateTime.UtcNow
        });
        db.WorkflowDefinitions.Add(new WorkflowDefinitionEntity
        {
            Id = workflowId, FormTypeId = formTypeId, VersionNo = 1, IsActive = true
        });
        db.WorkflowSteps.AddRange(
            new WorkflowStepEntity
            {
                Id = firstStepId, WorkflowDefinitionId = workflowId, StepNo = 1,
                Name = "Yönetici", AssigneeType = (short)WorkflowAssigneeType.DirectManager
            },
            new WorkflowStepEntity
            {
                Id = locationStepId, WorkflowDefinitionId = workflowId, StepNo = 2,
                Name = "İK", AssigneeType = (short)WorkflowAssigneeType.LocationBasedRole,
                TargetLocationRoleId = roleId, IsGlobalManagerInfoOnly = true
            });
        db.FormRequests.Add(request);
        db.FormRequestApprovals.AddRange(
            new FormRequestApprovalEntity
            {
                Id = Guid.NewGuid(), RequestId = request.Id, StepNo = 1,
                WorkflowStepId = firstStepId, Status = (short)ApprovalStatus.Approved,
                AssigneeUserId = manualApproverId, ActionByUserId = manualApproverId
            },
            new FormRequestApprovalEntity
            {
                Id = Guid.NewGuid(), RequestId = request.Id, StepNo = 2,
                WorkflowStepId = locationStepId, Status = (short)ApprovalStatus.Pending
            });
        db.FormRequestManualAssignments.Add(new FormRequestManualAssignmentEntity
        {
            Id = Guid.NewGuid(), FormRequestId = request.Id, StepNo = 1,
            AssigneeUserId = manualApproverId
        });
        db.QdmsPersoneller.Add(NewPerson(manualApproverId, "Gölcük 1045"));
        db.Roles.Add(new RoleEntity { Id = roleId, Code = "IK", Name = "İK", Active = true });
        db.UserLocationRoles.AddRange(
            new UserLocationRoleEntity
            {
                Id = Guid.NewGuid(), UserId = branchUserId, RoleId = roleId,
                LocationName = "Gölcük 1045", IsActive = true
            },
            new UserLocationRoleEntity
            {
                Id = Guid.NewGuid(), UserId = otherBranchUserId, RoleId = roleId,
                LocationName = "Bursa", IsActive = true
            },
            new UserLocationRoleEntity
            {
                Id = Guid.NewGuid(), UserId = globalUserId, RoleId = roleId,
                IsGlobalManager = true, IsActive = true
            });
        return (request, manualApproverId, branchUserId, otherBranchUserId, globalUserId);
    }

    private static QdmsPersonelAktarim NewPerson(Guid userId, string location) => new()
    {
        Id = Guid.NewGuid(), Sirket = "TEST", Sicil_No = Guid.NewGuid().ToString("N"),
        Adi = "Test", Soyadi = "Personel", LinkedUserId = userId,
        Isyeri_Tanimi = location, IsActive = true
    };

    private static DynamicFormsDbContext CreateContext() => new(
        new DbContextOptionsBuilder<DynamicFormsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options);
}
