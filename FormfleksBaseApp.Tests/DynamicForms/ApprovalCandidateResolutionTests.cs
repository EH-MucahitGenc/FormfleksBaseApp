using FormfleksBaseApp.Application.Common.Exceptions;
using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.Application.DynamicForms.Business.Services;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetPendingApprovals;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.GetMyRequests;
using FormfleksBaseApp.Application.Features.DynamicForms.Commands.ClaimDraft;
using FormfleksBaseApp.Domain.Constants;
using FormfleksBaseApp.Domain.Entities.Admin;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.DataAccess;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Microsoft.EntityFrameworkCore.Storage;
using Microsoft.Extensions.Logging.Abstractions;
using Moq;

namespace FormfleksBaseApp.Tests.DynamicForms;

public sealed class ApprovalCandidateResolutionTests
{
    [Fact]
    public async Task DirectManager_ReturnsAllActiveUsersAtTheManagerPosition()
    {
        await using var context = CreateContext();
        var requestorUserId = Guid.NewGuid();
        var managerUserIds = new[] { Guid.NewGuid(), Guid.NewGuid() };
        var workflowId = SeedWorkflow(context, WorkflowAssigneeType.DirectManager);

        context.QdmsPersoneller.Add(NewPerson("REQ", requestorUserId, "EMPLOYEE", "MANAGER"));
        context.QdmsPersoneller.Add(NewPerson("MGR-1", managerUserIds[0], "MANAGER", "DIRECTOR"));
        context.QdmsPersoneller.Add(NewPerson("MGR-2", managerUserIds[1], "MANAGER", "DIRECTOR"));
        await context.SaveChangesAsync();

        var result = await CreateEngine(context).ResolveNextValidStepAsync(
            workflowId, 0, requestorUserId, Guid.Empty, ct: CancellationToken.None);

        Assert.Null(result.AssigneeUserId);
        Assert.Equal(managerUserIds.Order(), result.CandidateUserIds.Order());
    }

    [Fact]
    public async Task DirectManager_KeepsSingleAssigneeForBackwardCompatibility()
    {
        await using var context = CreateContext();
        var requestorUserId = Guid.NewGuid();
        var managerUserId = Guid.NewGuid();
        var workflowId = SeedWorkflow(context, WorkflowAssigneeType.DirectManager);

        context.QdmsPersoneller.Add(NewPerson("REQ", requestorUserId, "EMPLOYEE", "MANAGER"));
        context.QdmsPersoneller.Add(NewPerson("MGR-1", managerUserId, "MANAGER", "DIRECTOR"));
        await context.SaveChangesAsync();

        var result = await CreateEngine(context).ResolveNextValidStepAsync(
            workflowId, 0, requestorUserId, Guid.Empty, ct: CancellationToken.None);

        Assert.Equal(managerUserId, result.AssigneeUserId);
        Assert.Equal([managerUserId], result.CandidateUserIds);
    }

    [Fact]
    public async Task UpperManager_ReturnsAllUsersAtTheSecondLevelPosition()
    {
        await using var context = CreateContext();
        var requestorUserId = Guid.NewGuid();
        var upperManagerUserIds = new[] { Guid.NewGuid(), Guid.NewGuid() };
        var workflowId = SeedWorkflow(context, WorkflowAssigneeType.UpperManager);

        context.QdmsPersoneller.Add(NewPerson("REQ", requestorUserId, "EMPLOYEE", "MANAGER"));
        context.QdmsPersoneller.Add(NewPerson("MGR-1", Guid.NewGuid(), "MANAGER", "DIRECTOR"));
        context.QdmsPersoneller.Add(NewPerson("MGR-2", Guid.NewGuid(), "MANAGER", "DIRECTOR"));
        context.QdmsPersoneller.Add(NewPerson("DIR-1", upperManagerUserIds[0], "DIRECTOR", "GENERAL"));
        context.QdmsPersoneller.Add(NewPerson("DIR-2", upperManagerUserIds[1], "DIRECTOR", "GENERAL"));
        await context.SaveChangesAsync();

        var result = await CreateEngine(context).ResolveNextValidStepAsync(
            workflowId, 0, requestorUserId, Guid.Empty, ct: CancellationToken.None);

        Assert.Null(result.AssigneeUserId);
        Assert.Equal(upperManagerUserIds.Order(), result.CandidateUserIds.Order());
    }

    [Fact]
    public async Task UpperManager_RejectsInconsistentSecondLevelHierarchy()
    {
        await using var context = CreateContext();
        var requestorUserId = Guid.NewGuid();
        var workflowId = SeedWorkflow(context, WorkflowAssigneeType.UpperManager);

        context.QdmsPersoneller.Add(NewPerson("REQ", requestorUserId, "EMPLOYEE", "MANAGER"));
        context.QdmsPersoneller.Add(NewPerson("MGR-1", Guid.NewGuid(), "MANAGER", "DIRECTOR-A"));
        context.QdmsPersoneller.Add(NewPerson("MGR-2", Guid.NewGuid(), "MANAGER", "DIRECTOR-B"));
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<WorkflowManualAssignmentRequiredException>(() =>
            CreateEngine(context).ResolveNextValidStepAsync(
                workflowId, 0, requestorUserId, Guid.Empty, ct: CancellationToken.None));
    }

    [Fact]
    public async Task DirectManager_SkipsGrayCollarAndReturnsAllEligibleUsersAboveIt()
    {
        await using var context = CreateContext();
        var requestorUserId = Guid.NewGuid();
        var eligibleUserIds = new[] { Guid.NewGuid(), Guid.NewGuid() };
        var workflowId = SeedWorkflow(context, WorkflowAssigneeType.DirectManager);

        context.QdmsPersoneller.Add(NewPerson("REQ", requestorUserId, "EMPLOYEE", "GRAY-MANAGER"));
        context.QdmsPersoneller.Add(NewPerson("GRAY-1", Guid.NewGuid(), "GRAY-MANAGER", "DIRECTOR", "GRİ YAKA"));
        context.QdmsPersoneller.Add(NewPerson("DIR-1", eligibleUserIds[0], "DIRECTOR", "GENERAL"));
        context.QdmsPersoneller.Add(NewPerson("DIR-2", eligibleUserIds[1], "DIRECTOR", "GENERAL"));
        await context.SaveChangesAsync();

        var result = await CreateEngine(context).ResolveNextValidStepAsync(
            workflowId, 0, requestorUserId, Guid.Empty, ct: CancellationToken.None);

        Assert.Equal(eligibleUserIds.Order(), result.CandidateUserIds.Order());
    }

    [Fact]
    public async Task UpperManager_DoesNotCountGrayCollarPositionsAsEligibleLevels()
    {
        await using var context = CreateContext();
        var requestorUserId = Guid.NewGuid();
        var upperManagerUserId = Guid.NewGuid();
        var workflowId = SeedWorkflow(context, WorkflowAssigneeType.UpperManager);

        context.QdmsPersoneller.Add(NewPerson("REQ", requestorUserId, "EMPLOYEE", "GRAY-MANAGER"));
        context.QdmsPersoneller.Add(NewPerson("GRAY-1", Guid.NewGuid(), "GRAY-MANAGER", "DIRECTOR", "GRİ YAKA"));
        context.QdmsPersoneller.Add(NewPerson("DIR-1", Guid.NewGuid(), "DIRECTOR", "VP"));
        context.QdmsPersoneller.Add(NewPerson("VP-1", upperManagerUserId, "VP", "GENERAL"));
        await context.SaveChangesAsync();

        var result = await CreateEngine(context).ResolveNextValidStepAsync(
            workflowId, 0, requestorUserId, Guid.Empty, ct: CancellationToken.None);

        Assert.Equal([upperManagerUserId], result.CandidateUserIds);
    }

    [Fact]
    public async Task GrayCollarPosition_WithDifferentUpperPositions_RequiresFallback()
    {
        await using var context = CreateContext();
        var requestorUserId = Guid.NewGuid();
        var workflowId = SeedWorkflow(context, WorkflowAssigneeType.DirectManager);

        context.QdmsPersoneller.Add(NewPerson("REQ", requestorUserId, "EMPLOYEE", "GRAY-MANAGER"));
        context.QdmsPersoneller.Add(NewPerson("GRAY-1", Guid.NewGuid(), "GRAY-MANAGER", "DIRECTOR-A", "GRİ YAKA"));
        context.QdmsPersoneller.Add(NewPerson("GRAY-2", Guid.NewGuid(), "GRAY-MANAGER", "DIRECTOR-B", "GRİ YAKA"));
        await context.SaveChangesAsync();

        await Assert.ThrowsAsync<WorkflowManualAssignmentRequiredException>(() =>
            CreateEngine(context).ResolveNextValidStepAsync(
                workflowId, 0, requestorUserId, Guid.Empty, ct: CancellationToken.None));
    }

    [Fact]
    public async Task GrayCollarUser_IsNeverEligibleAsAnAssignee()
    {
        await using var context = CreateContext();
        var grayUserId = Guid.NewGuid();
        context.QdmsPersoneller.Add(NewPerson(
            "GRAY-1",
            grayUserId,
            "GRAY-MANAGER",
            "DIRECTOR",
            "gri yaka"));
        await context.SaveChangesAsync();

        var resolver = new OrganizationAssigneeResolver(
            context,
            NullLogger<OrganizationAssigneeResolver>.Instance);

        Assert.False(await resolver.IsEligibleAssigneeAsync(grayUserId, CancellationToken.None));
    }

    [Fact]
    public async Task ApprovalConcurrencyToken_AllowsOnlyTheFirstUpdate()
    {
        var root = new InMemoryDatabaseRoot();
        var options = new DbContextOptionsBuilder<DynamicFormsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString(), root)
            .Options;
        var approvalId = Guid.NewGuid();

        await using (var seed = new DynamicFormsDbContext(options))
        {
            seed.FormRequestApprovals.Add(new FormRequestApprovalEntity
            {
                Id = approvalId,
                RequestId = Guid.NewGuid(),
                WorkflowStepId = Guid.NewGuid(),
                StepNo = 1,
                Status = (short)ApprovalStatus.Pending,
                ConcurrencyToken = 0
            });
            await seed.SaveChangesAsync();
        }

        await using var firstContext = new DynamicFormsDbContext(options);
        await using var secondContext = new DynamicFormsDbContext(options);
        var first = await firstContext.FormRequestApprovals.SingleAsync(x => x.Id == approvalId);
        var second = await secondContext.FormRequestApprovals.SingleAsync(x => x.Id == approvalId);

        first.Status = (short)ApprovalStatus.Approved;
        first.ConcurrencyToken++;
        await firstContext.SaveChangesAsync();

        second.Status = (short)ApprovalStatus.Approved;
        second.ConcurrencyToken++;
        await Assert.ThrowsAsync<DbUpdateConcurrencyException>(() => secondContext.SaveChangesAsync());
    }

    [Fact]
    public async Task Candidate_CanSeeTheSharedApprovalInPendingList()
    {
        await using var context = CreateContext();
        var candidateUserId = Guid.NewGuid();
        var requestorUserId = Guid.NewGuid();
        var formTypeId = Guid.NewGuid();
        var requestId = Guid.NewGuid();
        var workflowStepId = Guid.NewGuid();
        var approvalId = Guid.NewGuid();

        context.FormTypes.Add(new FormTypeEntity
        {
            Id = formTypeId,
            Code = "TEST",
            Name = "Test Formu",
            Active = true,
            CreatedByUserId = requestorUserId,
            CreatedAt = DateTime.UtcNow
        });
        context.WorkflowSteps.Add(new WorkflowStepEntity
        {
            Id = workflowStepId,
            WorkflowDefinitionId = Guid.NewGuid(),
            StepNo = 1,
            Name = "Direkt Yönetici",
            AssigneeType = (short)WorkflowAssigneeType.DirectManager
        });
        context.FormRequests.Add(new FormRequestEntity
        {
            Id = requestId,
            FormTypeId = formTypeId,
            RequestNo = "REQ-1",
            RequestorUserId = requestorUserId,
            Status = (short)FormRequestStatus.InApproval,
            CurrentStepNo = 1,
            CreatedAt = DateTime.UtcNow
        });
        context.FormRequestApprovals.Add(new FormRequestApprovalEntity
        {
            Id = approvalId,
            RequestId = requestId,
            WorkflowStepId = workflowStepId,
            StepNo = 1,
            Status = (short)ApprovalStatus.Pending
        });
        context.FormRequestAssignments.Add(new FormRequestAssignmentEntity
        {
            Id = Guid.NewGuid(),
            RequestId = requestId,
            ApprovalId = approvalId,
            UserId = candidateUserId,
            AssignmentType = (short)FormRequestAssignmentType.ApprovalCandidate,
            CreatedAt = DateTime.UtcNow
        });
        context.QdmsPersoneller.Add(NewPerson("REQ", requestorUserId, "EMPLOYEE", "MANAGER"));
        await context.SaveChangesAsync();

        var handler = new GetPendingApprovalsQueryHandler(
            context,
            NullLogger<GetPendingApprovalsQueryHandler>.Instance,
            Mock.Of<FormfleksBaseApp.Application.Auth.Interfaces.IUserRepository>());

        var result = await handler.Handle(new GetPendingApprovalsQuery(candidateUserId), CancellationToken.None);

        Assert.Equal(approvalId, Assert.Single(result).ApprovalId);
    }

    [Fact]
    public async Task DraftCandidate_CanSeeAndClaimTheSingleSharedDraft()
    {
        await using var context = CreateContext();
        var candidateUserId = Guid.NewGuid();
        var otherCandidateUserId = Guid.NewGuid();
        var formTypeId = Guid.NewGuid();
        var requestId = Guid.NewGuid();

        context.FormTypes.Add(new FormTypeEntity
        {
            Id = formTypeId,
            Code = "2AYLIKDENEME",
            Name = "2 Aylık Deneme",
            Active = true,
            CreatedByUserId = ProbationFormConstants.SystemUserId,
            CreatedAt = DateTime.UtcNow,
            SystemUsageType = "2_AY_DENEME"
        });
        context.FormRequests.Add(new FormRequestEntity
        {
            Id = requestId,
            FormTypeId = formTypeId,
            RequestNo = "PRB2-TEST",
            RequestorUserId = ProbationFormConstants.SystemUserId,
            Status = (short)FormRequestStatus.Draft,
            CreatedAt = DateTime.UtcNow
        });
        foreach (var userId in new[] { candidateUserId, otherCandidateUserId })
        {
            context.FormRequestAssignments.Add(new FormRequestAssignmentEntity
            {
                Id = Guid.NewGuid(),
                RequestId = requestId,
                UserId = userId,
                AssignmentType = (short)FormRequestAssignmentType.DraftEvaluator,
                CreatedAt = DateTime.UtcNow
            });
        }
        await context.SaveChangesAsync();

        var listed = await new GetMyRequestsQueryHandler(context)
            .Handle(new GetMyRequestsQuery(candidateUserId), CancellationToken.None);
        Assert.True(Assert.Single(listed).CanClaimDraft);

        var organizationResolver = new OrganizationAssigneeResolver(
            context,
            NullLogger<OrganizationAssigneeResolver>.Instance);
        var claimed = await new ClaimDraftCommandHandler(context, organizationResolver)
            .Handle(new ClaimDraftCommand(requestId, candidateUserId), CancellationToken.None);
        Assert.Equal(requestId, claimed.RequestId);

        var otherCandidateList = await new GetMyRequestsQueryHandler(context)
            .Handle(new GetMyRequestsQuery(otherCandidateUserId), CancellationToken.None);
        Assert.Empty(otherCandidateList);

        var exception = await Assert.ThrowsAsync<BusinessException>(() =>
            new ClaimDraftCommandHandler(context, organizationResolver)
                .Handle(new ClaimDraftCommand(requestId, otherCandidateUserId), CancellationToken.None));
        Assert.Contains("başka bir kullanıcı", exception.Message);
    }

    private static DynamicFormsDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<DynamicFormsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new DynamicFormsDbContext(options);
    }

    private static ApprovalEngineService CreateEngine(DynamicFormsDbContext context)
    {
        var resolver = new OrganizationAssigneeResolver(
            context,
            NullLogger<OrganizationAssigneeResolver>.Instance);
        return new ApprovalEngineService(context, resolver, NullLogger<ApprovalEngineService>.Instance);
    }

    private static Guid SeedWorkflow(DynamicFormsDbContext context, WorkflowAssigneeType assigneeType)
    {
        var workflowId = Guid.NewGuid();
        context.WorkflowDefinitions.Add(new WorkflowDefinitionEntity
        {
            Id = workflowId,
            FormTypeId = Guid.NewGuid(),
            VersionNo = 1,
            IsActive = true
        });
        context.WorkflowSteps.Add(new WorkflowStepEntity
        {
            Id = Guid.NewGuid(),
            WorkflowDefinitionId = workflowId,
            StepNo = 1,
            Name = assigneeType.ToString(),
            AssigneeType = (short)assigneeType,
            FallbackAction = (short)WorkflowFallbackAction.Skip
        });
        return workflowId;
    }

    private static QdmsPersonelAktarim NewPerson(
        string registryNo,
        Guid userId,
        string positionCode,
        string? upperPositionCode,
        string? groupDescription = null) => new()
        {
            Id = Guid.NewGuid(),
            Sirket = "TEST",
            Sicil_No = registryNo,
            Adi = registryNo,
            Pozisyon_Kodu = positionCode,
            Ust_Pozisyon_Kodu = upperPositionCode,
            Grup_Kodu_Aciklama = groupDescription,
            LinkedUserId = userId,
            IsActive = true,
            CreatedAt = DateTime.UtcNow
        };
}
