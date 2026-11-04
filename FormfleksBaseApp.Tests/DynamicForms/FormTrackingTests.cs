using FormfleksBaseApp.Application.Features.AdminUsers.Interfaces;
using FormfleksBaseApp.Application.Features.DynamicForms.Commands.SaveDraft;
using FormfleksBaseApp.Application.Features.DynamicForms.Queries.Reports.GetFormTracking;
using FormfleksBaseApp.Domain.Constants;
using FormfleksBaseApp.Domain.Entities;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.DataAccess;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using Microsoft.EntityFrameworkCore;
using Moq;

namespace FormfleksBaseApp.Tests.DynamicForms;

public sealed class FormTrackingTests
{
    [Fact]
    public async Task TrackingList_ReportsUnclaimedDraftPoolAndSubjectPerson()
    {
        await using var context = CreateContext();
        var formTypeId = Guid.NewGuid();
        var requestId = Guid.NewGuid();
        var subjectFieldId = Guid.NewGuid();
        var candidateOne = NewUser("Yönetici Bir", "yonetici1@formfleks.com.tr");
        var candidateTwo = NewUser("Yönetici İki", "yonetici2@formfleks.com.tr");
        var systemUser = new AppUser
        {
            Id = ProbationFormConstants.SystemUserId,
            Email = "system@formfleks.invalid",
            DisplayName = "Formfleks Sistem Kullanıcısı",
            CreatedAt = DateTime.UtcNow
        };

        context.FormTypes.Add(new FormTypeEntity
        {
            Id = formTypeId,
            Code = "PROBATION_2",
            Name = "2 Aylık Deneme Formu",
            SystemUsageType = "2_AY_DENEME",
            Active = true
        });
        context.FormFields.Add(new FormFieldEntity
        {
            Id = subjectFieldId,
            FormTypeId = formTypeId,
            SectionId = Guid.NewGuid(),
            FieldKey = "adi_soyadi",
            Label = "ADI SOYADI",
            Active = true
        });
        context.FormRequests.Add(new FormRequestEntity
        {
            Id = requestId,
            FormTypeId = formTypeId,
            RequestNo = "PRB2-TEST-1",
            RequestorUserId = ProbationFormConstants.SystemUserId,
            Status = (short)FormRequestStatus.Draft,
            CreatedAt = DateTime.UtcNow.AddDays(-4)
        });
        context.FormRequestValues.Add(new FormRequestValueEntity
        {
            Id = Guid.NewGuid(),
            RequestId = requestId,
            FieldId = subjectFieldId,
            FieldKey = "adi_soyadi",
            ValueText = "Deneme Personeli"
        });
        context.FormRequestAssignments.AddRange(
            NewDraftAssignment(requestId, candidateOne.Id),
            NewDraftAssignment(requestId, candidateTwo.Id));
        await context.SaveChangesAsync();

        var userRepository = new Mock<IAdminUserRepository>();
        userRepository.Setup(x => x.GetAllUsersWithRolesAsync(It.IsAny<CancellationToken>()))
            .ReturnsAsync([systemUser, candidateOne, candidateTwo]);

        var result = await new GetFormTrackingListQueryHandler(context, userRepository.Object)
            .Handle(new GetFormTrackingListQuery
            {
                Search = "Deneme Personeli",
                OwnerSearch = "Yönetici İki",
                MinWaitingDays = 3
            }, CancellationToken.None);

        var item = Assert.Single(result.Items);
        Assert.Equal("Deneme Personeli", item.SubjectPersonName);
        Assert.True(item.IsPooledDraft);
        Assert.Equal(["Yönetici Bir", "Yönetici İki"], item.DraftCandidates.Order().ToArray());
        Assert.Equal(4, item.WaitingDays);
    }

    [Fact]
    public async Task SaveDraft_NewRequest_WritesDraftCreatedAudit()
    {
        await using var context = CreateContext();
        var formTypeId = Guid.NewGuid();
        var userId = Guid.NewGuid();
        context.FormTypes.Add(new FormTypeEntity
        {
            Id = formTypeId,
            Code = "TEST_FORM",
            Name = "Test Formu",
            Active = true
        });
        await context.SaveChangesAsync();

        var result = await new SaveDraftCommandHandler(context).Handle(
            new SaveDraftCommand(new SaveDraftRequestDto
            {
                FormTypeId = formTypeId,
                RequestorUserId = userId,
                Values = []
            }), CancellationToken.None);

        var audit = await context.AuditLogs.SingleAsync();
        Assert.Equal(result.RequestId, audit.EntityId);
        Assert.Equal("DraftCreated", audit.ActionType);
        Assert.Equal(userId, audit.ActorUserId);
    }

    private static DynamicFormsDbContext CreateContext()
    {
        var options = new DbContextOptionsBuilder<DynamicFormsDbContext>()
            .UseInMemoryDatabase(Guid.NewGuid().ToString())
            .Options;
        return new DynamicFormsDbContext(options);
    }

    private static AppUser NewUser(string displayName, string email) => new()
    {
        Id = Guid.NewGuid(),
        Email = email,
        DisplayName = displayName,
        CreatedAt = DateTime.UtcNow
    };

    private static FormRequestAssignmentEntity NewDraftAssignment(Guid requestId, Guid userId) => new()
    {
        Id = Guid.NewGuid(),
        RequestId = requestId,
        UserId = userId,
        AssignmentType = (short)FormRequestAssignmentType.DraftEvaluator,
        CreatedAt = DateTime.UtcNow
    };
}
