using FormfleksBaseApp.Application.Common;
using FormfleksBaseApp.DynamicForms.Business.Contracts;
using FormfleksBaseApp.DynamicForms.Business.Services;
using FormfleksBaseApp.DynamicForms.DataAccess;
using FormfleksBaseApp.Domain.Entities.DynamicForms;
using FormfleksBaseApp.DynamicForms.Domain.Enums;
using Microsoft.EntityFrameworkCore;

namespace FormfleksBaseApp.Infrastructure.DynamicForms.DataAccess.Services;

[System.Obsolete("Bu genel amaçlı servis parçalanmaktadır. Yeni eklemeler DBContext üzerinden Command/Query Handler'lara doğrudan yazılmalıdır.")]
public class DynamicFormServices : IFormDefinitionService, IFormTemplateAdminService, IFormRequestService, IApprovalService
{
    private readonly DynamicFormsDbContext _db;

    public DynamicFormServices(DynamicFormsDbContext db)
    {
        _db = db;
    }

    // ─── IFormDefinitionService ───────────────────────────────────────

    public async Task<FormDefinitionDto?> GetDefinitionByCodeAsync(string code, CancellationToken ct)
    {
        var formType = await _db.FormTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(t => EF.Functions.ILike(t.Code.Trim(), code.Trim()) && t.Active, ct);

        if (formType is null) return null;

        var sections = await _db.FormSections
            .AsNoTracking()
            .Where(s => s.FormTypeId == formType.Id)
            .OrderBy(s => s.SortOrder)
            .ToListAsync(ct);

        var fields = await _db.FormFields
            .AsNoTracking()
            .Where(f => f.FormTypeId == formType.Id && f.Active)
            .OrderBy(f => f.SortOrder)
            .ToListAsync(ct);

        var sectionDtos = new List<FormSectionDto>();

        // 1. Tanımlı bölümleri ve onların alanlarını ekle
        foreach (var sec in sections)
        {
            var fieldDtos = fields.Where(f => f.SectionId == sec.Id)
                .Select(fld => MapToFieldDto(fld)).ToList();

            sectionDtos.Add(new FormSectionDto
            {
                SectionId = sec.Id,
                Title = sec.Title,
                SortOrder = sec.SortOrder,
                Fields = fieldDtos
            });
        }

        // 2. Bir bölümü olmayan (SectionId == null) alanları "Genel Bilgiler" sanal bölümünde topla
        var orphanedFields = fields.Where(f => f.SectionId == null || !sections.Any(s => s.Id == f.SectionId)).ToList();
        if (orphanedFields.Any())
        {
            sectionDtos.Add(new FormSectionDto
            {
                SectionId = Guid.Empty,
                Title = "Genel Bilgiler",
                SortOrder = -1, // En üstte görünsün
                Fields = orphanedFields.Select(fld => MapToFieldDto(fld)).ToList()
            });
        }

        return new FormDefinitionDto
        {
            FormTypeId = formType.Id,
            Code = formType.Code,
            Name = formType.Name,
            Sections = sectionDtos.OrderBy(s => s.SortOrder).ToList()
        };
    }

    private static FormFieldDto MapToFieldDto(FormFieldEntity fld)
    {
        return new FormFieldDto
        {
            FieldId = fld.Id,
            Key = fld.FieldKey,
            Label = fld.Label,
            FieldType = fld.FieldType,
            IsRequired = fld.IsRequired,
            SortOrder = fld.SortOrder,
            Placeholder = fld.Placeholder,
            HelpText = fld.HelpText,
            DefaultValue = fld.DefaultValue,
            OptionsJson = fld.OptionsJson,
            ValidationJson = fld.ValidationRuleJson,
            VisibilityRuleJson = fld.VisibilityRuleJson
        };
    }

    // ─── IFormTemplateAdminService ────────────────────────────────────

    public Task<List<FormTemplateSummaryDto>> GetTemplatesAsync(CancellationToken ct)
    {
        return _db.FormTypes
            .AsNoTracking()
            .OrderBy(t => t.Name)
            .Select(t => new FormTemplateSummaryDto
            {
                FormTypeId = t.Id,
                Code = t.Code,
                Name = t.Name,
                Active = t.Active,
                CreatedAt = t.CreatedAt
            })
            .ToListAsync(ct);
    }

    public async Task<FormTemplateSummaryDto> UpsertTemplateAsync(FormTemplateUpsertDto dto, Guid actorUserId, CancellationToken ct)
    {
        FormTypeEntity formType;

        if (dto.FormTypeId.HasValue && dto.FormTypeId.Value != Guid.Empty)
        {
            formType = await _db.FormTypes
                .FirstOrDefaultAsync(t => t.Id == dto.FormTypeId.Value, ct)
                ?? throw new BusinessException("Şablon bulunamadı.");

            formType.Code = dto.Code;
            formType.Name = dto.Name;
            formType.Active = dto.Active;

            // Eski section ve field'ları temizle
            var oldSections = await _db.FormSections.Where(s => s.FormTypeId == formType.Id).ToListAsync(ct);
            var oldFields = await _db.FormFields.Where(f => f.FormTypeId == formType.Id).ToListAsync(ct);
            _db.FormFields.RemoveRange(oldFields);
            _db.FormSections.RemoveRange(oldSections);
        }
        else
        {
            formType = new FormTypeEntity
            {
                Code = dto.Code,
                Name = dto.Name,
                Active = dto.Active,
                CreatedByUserId = actorUserId,
                CreatedAt = DateTime.UtcNow
            };
            _db.FormTypes.Add(formType);
        }

        await _db.SaveChangesAsync(ct); // ID oluşsun

        foreach (var secDto in dto.Sections)
        {
            var sec = new FormSectionEntity
            {
                FormTypeId = formType.Id,
                Title = secDto.Title,
                SortOrder = secDto.SortOrder
            };
            _db.FormSections.Add(sec);
            await _db.SaveChangesAsync(ct); // SectionId oluşsun

            // Alanlar bu section'a bağlanacaksa
            var sectionFields = dto.Fields
                .Where(f => f.SectionTitle == secDto.Title);

            foreach (var fldDto in sectionFields)
            {
                _db.FormFields.Add(new FormFieldEntity
                {
                    FormTypeId = formType.Id,
                    SectionId = sec.Id,
                    FieldKey = fldDto.FieldKey,
                    Label = fldDto.Label,
                    FieldType = (short)fldDto.FieldType,
                    IsRequired = fldDto.IsRequired,
                    SortOrder = fldDto.SortOrder,
                    Placeholder = fldDto.Placeholder,
                    HelpText = fldDto.HelpText,
                    DefaultValue = fldDto.DefaultValue,
                    VisibilityRuleJson = fldDto.VisibilityRuleJson,
                    ValidationRuleJson = fldDto.ValidationRuleJson,
                    OptionsJson = fldDto.OptionsJson,
                    Active = fldDto.Active
                });
            }
        }

        await _db.SaveChangesAsync(ct);

        return new FormTemplateSummaryDto
        {
            FormTypeId = formType.Id,
            Code = formType.Code,
            Name = formType.Name,
            Active = formType.Active,
            CreatedAt = formType.CreatedAt
        };
    }

    public async Task SetTemplateActiveAsync(Guid templateId, bool isActive, CancellationToken ct)
    {
        var formType = await _db.FormTypes.FindAsync(new object[] { templateId }, ct);
        if (formType is null) throw new BusinessException("Şablon bulunamadı.");

        formType.Active = isActive;
        await _db.SaveChangesAsync(ct);
    }

    public Task<List<FormTemplateRoleDto>> GetRolesAsync(CancellationToken ct)
    {
        return _db.Roles
            .AsNoTracking()
            .Where(r => r.Active)
            .OrderBy(r => r.Name)
            .Select(r => new FormTemplateRoleDto { Id = r.Id, Name = r.Name })
            .ToListAsync(ct);
    }

    public async Task<List<FormTemplateWorkflowStepUpsertDto>> GetWorkflowStepsAsync(Guid templateId, CancellationToken ct)
    {
        // Aktif workflow definition bul
        var wfDef = await _db.WorkflowDefinitions
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.FormTypeId == templateId && w.IsActive, ct);

        if (wfDef is null) return new List<FormTemplateWorkflowStepUpsertDto>();

        var steps = await _db.WorkflowSteps
            .AsNoTracking()
            .Where(s => s.WorkflowDefinitionId == wfDef.Id)
            .OrderBy(s => s.StepNo)
            .ToListAsync(ct);

        return steps.Select(s => new FormTemplateWorkflowStepUpsertDto
        {
            StepNo = s.StepNo,
            Name = s.Name,
            AssigneeType = s.AssigneeType,
            AssigneeUserId = s.AssigneeUserId,
            AssigneeRoleId = s.AssigneeRoleId,
            DynamicRuleJson = s.DynamicRuleJson,
            AllowReturnForRevision = s.AllowReturnForRevision
        }).ToList();
    }

    public async Task<int> UpsertWorkflowStepsAsync(Guid templateId, List<FormTemplateWorkflowStepUpsertDto> stepsDto, Guid actorUserId, CancellationToken ct)
    {
        // Mevcut aktif workflow definition bul veya oluştur
        var wfDef = await _db.WorkflowDefinitions
            .FirstOrDefaultAsync(w => w.FormTypeId == templateId && w.IsActive, ct);

        if (wfDef is null)
        {
            wfDef = new WorkflowDefinitionEntity
            {
                FormTypeId = templateId,
                VersionNo = 1,
                IsActive = true
            };
            _db.WorkflowDefinitions.Add(wfDef);
            await _db.SaveChangesAsync(ct);
        }

        // Eski adımları sil
        var existingSteps = await _db.WorkflowSteps
            .Where(s => s.WorkflowDefinitionId == wfDef.Id)
            .ToListAsync(ct);
        _db.WorkflowSteps.RemoveRange(existingSteps);

        // Yeni adımları ekle
        foreach (var sDto in stepsDto.OrderBy(x => x.StepNo))
        {
            _db.WorkflowSteps.Add(new WorkflowStepEntity
            {
                WorkflowDefinitionId = wfDef.Id,
                StepNo = sDto.StepNo,
                Name = sDto.Name ?? $"Adım {sDto.StepNo}",
                AssigneeType = (short)sDto.AssigneeType,
                AssigneeUserId = sDto.AssigneeUserId,
                AssigneeRoleId = sDto.AssigneeRoleId,
                DynamicRuleJson = sDto.DynamicRuleJson,
                AllowReturnForRevision = sDto.AllowReturnForRevision
            });
        }

        return await _db.SaveChangesAsync(ct);
    }

    // ─── IFormRequestService ─────────────────────────────────────────

    public async Task<FormRequestResultDto> SaveDraftAsync(SaveDraftRequestDto dto, CancellationToken ct)
    {
        FormRequestEntity req;

        if (dto.RequestId.HasValue && dto.RequestId.Value != Guid.Empty)
        {
            req = await _db.FormRequests
                .FirstOrDefaultAsync(r => r.Id == dto.RequestId.Value, ct)
                ?? throw new BusinessException("Kayıt bulunamadı.");

            if (req.Status != (short)FormRequestStatus.Draft)
                throw new BusinessException("Sadece taslak (Draft) durumundaki talepler güncellenebilir.");
            if (req.RequestorUserId != dto.RequestorUserId)
                throw new BusinessException("Bu talebi güncelleme yetkiniz yok.");

            // Eski değerleri sil
            var oldValues = await _db.FormRequestValues
                .Where(v => v.RequestId == req.Id).ToListAsync(ct);
            _db.FormRequestValues.RemoveRange(oldValues);
        }
        else
        {
            req = new FormRequestEntity
            {
                FormTypeId = dto.FormTypeId,
                RequestNo = "REQ-" + DateTime.UtcNow.ToString("yyyyMMdd-HHmmss") + "-" + Guid.NewGuid().ToString("N").Substring(0, 4).ToUpperInvariant(),
                RequestorUserId = dto.RequestorUserId,
                Status = (short)FormRequestStatus.Draft,
                CreatedAt = DateTime.UtcNow
            };
            _db.FormRequests.Add(req);
        }

        await _db.SaveChangesAsync(ct);

        // Alan kimlikleri için form alanlarını bulalım
        var formFields = await _db.FormFields
            .AsNoTracking()
            .Where(f => f.FormTypeId == req.FormTypeId)
            .ToListAsync(ct);

        // Yeni değerleri ekle
        foreach (var v in dto.Values)
        {
            var fieldDef = formFields.FirstOrDefault(f => f.FieldKey == v.FieldKey);
            var actualFieldId = fieldDef?.Id ?? Guid.NewGuid();

            _db.FormRequestValues.Add(new FormRequestValueEntity
            {
                RequestId = req.Id,
                FieldId = actualFieldId,
                FieldKey = v.FieldKey,
                ValueText = v.ValueText,
                ValueNumber = v.ValueNumber,
                ValueDateTime = v.ValueDateTime,
                ValueBool = v.ValueBool,
                ValueJson = v.ValueJson
            });
        }

        await _db.SaveChangesAsync(ct);

        return new FormRequestResultDto
        {
            RequestId = req.Id,
            Status = (FormRequestStatus)req.Status,
            CurrentStepNo = req.CurrentStepNo,
            ConcurrencyToken = req.ConcurrencyToken
        };
    }

    public async Task<FormRequestResultDto> SubmitAsync(SubmitRequestDto dto, CancellationToken ct)
    {
        var req = await _db.FormRequests
            .FirstOrDefaultAsync(r => r.Id == dto.RequestId, ct)
            ?? throw new BusinessException("Kayıt bulunamadı.");

        if (req.Status != (short)FormRequestStatus.Draft)
            throw new BusinessException("Sadece taslak (Draft) durumundaki formlar onaya gönderilebilir.");

        // Aktif workflow bul
        var wfDef = await _db.WorkflowDefinitions
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.FormTypeId == req.FormTypeId && w.IsActive, ct);

        if (wfDef is null)
        {
            // Onay rotası yoksa direkt ONAYLANDI yap
            req.Approve((short)FormRequestStatus.Approved);
        }
        else
        {
            var firstStep = await _db.WorkflowSteps
                .AsNoTracking()
                .Where(s => s.WorkflowDefinitionId == wfDef.Id)
                .OrderBy(s => s.StepNo)
                .FirstOrDefaultAsync(ct);

            if (firstStep is null)
            {
                req.Approve((short)FormRequestStatus.Approved);
            }
            else
            {
                req.Submit((short)FormRequestStatus.InApproval);
                req.CurrentStepNo = firstStep.StepNo;

                // Onay adımı kaydı oluştur
                _db.FormRequestApprovals.Add(new FormRequestApprovalEntity
                {
                    RequestId = req.Id,
                    StepNo = firstStep.StepNo,
                    WorkflowStepId = firstStep.Id,
                    Status = (short)FormRequestStatus.InApproval,
                    AssigneeRoleId = firstStep.AssigneeRoleId,
                    AssigneeUserId = firstStep.AssigneeUserId
                });
            }
        }

        _db.AuditLogs.Add(new AuditLogEntity
        {
            EntityType = "FormRequest",
            EntityId = req.Id,
            ActionType = "FormSubmitted",
            ActorUserId = req.RequestorUserId,
            DetailJson = $"{{\"Status\": \"{req.Status}\", \"StepNo\": {req.CurrentStepNo}}}",
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(ct);

        return new FormRequestResultDto
        {
            RequestId = req.Id,
            Status = (FormRequestStatus)req.Status,
            CurrentStepNo = req.CurrentStepNo,
            ConcurrencyToken = req.ConcurrencyToken
        };
    }

    public async Task<List<MyFormRequestListItemDto>> GetMyRequestsAsync(Guid userId, CancellationToken ct)
    {
        var query = from r in _db.FormRequests.AsNoTracking()
                    join t in _db.FormTypes.AsNoTracking() on r.FormTypeId equals t.Id
                    where r.RequestorUserId == userId
                    orderby r.CreatedAt descending
                    select new MyFormRequestListItemDto
                    {
                        RequestId = r.Id,
                        RequestNo = r.RequestNo,
                        FormTypeCode = t.Code,
                        FormTypeName = t.Name,
                        Status = (FormRequestStatus)r.Status,
                        CurrentStepNo = r.CurrentStepNo,
                        CreatedAt = r.CreatedAt
                    };

        return await query.ToListAsync(ct);
    }

    public async Task<FormRequestDetailedDto?> GetRequestDetailedAsync(Guid requestId, CancellationToken ct)
    {
        var req = await _db.FormRequests
            .AsNoTracking()
            .FirstOrDefaultAsync(r => r.Id == requestId, ct);

        if (req is null) return null;

        var formType = await _db.FormTypes
            .AsNoTracking()
            .FirstOrDefaultAsync(t => t.Id == req.FormTypeId, ct);

        var values = await _db.FormRequestValues
            .AsNoTracking()
            .Where(v => v.RequestId == req.Id)
            .ToListAsync(ct);

        return new FormRequestDetailedDto
        {
            RequestId = req.Id,
            RequestNo = req.RequestNo ?? string.Empty,
            FormTypeCode = formType?.Code ?? string.Empty,
            Status = (FormRequestStatus)req.Status,
            ConcurrencyToken = req.ConcurrencyToken,
            Values = values.Select(v => new FormRequestValueDto
            {
                FieldKey = v.FieldKey,
                ValueText = v.ValueText
            }).ToList()
        };
    }

    // ─── IApprovalService ────────────────────────────────────────────

    public async Task<List<PendingApprovalListItemDto>> GetPendingApprovalsAsync(Guid userId, CancellationToken ct)
    {
        var userRoleIds = await _db.UserRoles
            .AsNoTracking()
            .Where(ur => ur.UserId == userId)
            .Select(ur => ur.RoleId)
            .ToListAsync(ct);

        if (!userRoleIds.Any())
            return new List<PendingApprovalListItemDto>();

        // Onay bekleyen tüm talepleri getir (InApproval durumundakiler)
        var pendingApprovals = await (from app in _db.FormRequestApprovals.AsNoTracking()
                                      join r in _db.FormRequests.AsNoTracking() on app.RequestId equals r.Id
                                      join t in _db.FormTypes.AsNoTracking() on r.FormTypeId equals t.Id
                                      where app.Status == (short)ApprovalStatus.Pending
                                      && (app.AssigneeUserId == userId || (app.AssigneeRoleId.HasValue && userRoleIds.Contains(app.AssigneeRoleId.Value)))
                                      orderby app.StepNo ascending, r.CreatedAt ascending
                                      select new PendingApprovalListItemDto
                                      {
                                          ApprovalId = app.Id,
                                          RequestId = r.Id,
                                          RequestNo = r.RequestNo,
                                          StepNo = app.StepNo,
                                          AssigneeUserId = app.AssigneeUserId,
                                          AssigneeRoleId = app.AssigneeRoleId,
                                          RequestorUserId = r.RequestorUserId,
                                          FormTypeName = t.Name,
                                          ApprovalConcurrencyToken = app.ConcurrencyToken,
                                          CreatedAt = r.CreatedAt
                                      }).ToListAsync(ct);

        return pendingApprovals;
    }

    public async Task<ApprovalActionResponseDto> ExecuteActionAsync(ApprovalActionRequestDto reqDto, CancellationToken ct)
    {
        var req = await _db.FormRequests
            .FirstOrDefaultAsync(r => r.Id == reqDto.RequestId, ct)
            ?? throw new BusinessException("Kayıt bulunamadı.");

        if (req.Status != (short)FormRequestStatus.InApproval)
            throw new BusinessException("Bu kayıt şu an onay bekleyen statüde değil.");

        // Workflow tanımını bul
        var wfDef = await _db.WorkflowDefinitions
            .AsNoTracking()
            .FirstOrDefaultAsync(w => w.FormTypeId == req.FormTypeId && w.IsActive, ct)
            ?? throw new BusinessException("Onay rotası bulunamadı.");

        var currentStep = await _db.WorkflowSteps
            .AsNoTracking()
            .FirstOrDefaultAsync(s => s.WorkflowDefinitionId == wfDef.Id && s.StepNo == req.CurrentStepNo, ct)
            ?? throw new BusinessException("Geçersiz onay adımı durumu.");

        // Yetki kontrolü
        var userRoleIds = await _db.UserRoles
            .AsNoTracking()
            .Where(ur => ur.UserId == reqDto.ActorUserId)
            .Select(ur => ur.RoleId)
            .ToListAsync(ct);

        if (!currentStep.AssigneeRoleId.HasValue || !userRoleIds.Contains(currentStep.AssigneeRoleId.Value))
            throw new BusinessException("Bu dokümanı şu anki kademede onaylama/reddetme yetkiniz bulunmuyor.");

        // Onay kaydını güncelle
        var approval = await _db.FormRequestApprovals
            .FirstOrDefaultAsync(a => a.RequestId == req.Id && a.StepNo == req.CurrentStepNo, ct);

        if (approval is not null)
        {
            approval.ActionByUserId = reqDto.ActorUserId;
            approval.ActionComment = reqDto.Comment;
            approval.ActionAt = DateTime.UtcNow;
        }

        if (reqDto.ActionType == ApprovalActionType.Reject)
        {
            req.Reject((short)FormRequestStatus.Rejected);

            if (approval is not null)
                approval.Status = (short)FormRequestStatus.Rejected;
        }
        else if (reqDto.ActionType == ApprovalActionType.ReturnForRevision)
        {
            req.ReturnForRevision((short)FormRequestStatus.ReturnedForRevision);

            if (approval is not null)
                approval.Status = (short)FormRequestStatus.ReturnedForRevision;
        }
        else // Approve
        {
            if (approval is not null)
                approval.Status = (short)FormRequestStatus.Approved;

            // Sonraki adımı bul
            var nextStep = await _db.WorkflowSteps
                .AsNoTracking()
                .Where(s => s.WorkflowDefinitionId == wfDef.Id && s.StepNo > req.CurrentStepNo)
                .OrderBy(s => s.StepNo)
                .FirstOrDefaultAsync(ct);

            if (nextStep is null)
            {
                req.Approve((short)FormRequestStatus.Approved);
            }
            else
            {
                req.CurrentStepNo = nextStep.StepNo;

                // Yeni adim icin approval kaydi
                _db.FormRequestApprovals.Add(new FormRequestApprovalEntity
                {
                    RequestId = req.Id,
                    StepNo = nextStep.StepNo,
                    WorkflowStepId = nextStep.Id,
                    Status = (short)FormRequestStatus.InApproval,
                    AssigneeRoleId = nextStep.AssigneeRoleId,
                    AssigneeUserId = nextStep.AssigneeUserId
                });
            }
        }

        _db.AuditLogs.Add(new AuditLogEntity
        {
            EntityType = "FormRequestApproval",
            EntityId = req.Id,
            ActionType = reqDto.ActionType == ApprovalActionType.Approve ? "Approved" :
                         reqDto.ActionType == ApprovalActionType.Reject ? "Rejected" : "ReturnedForRevision",
            ActorUserId = reqDto.ActorUserId,
            DetailJson = $"{{\"Comment\": \"{reqDto.Comment}\", \"StepNo\": {req.CurrentStepNo}}}",
            CreatedAt = DateTime.UtcNow
        });

        await _db.SaveChangesAsync(ct);

        return new ApprovalActionResponseDto { Success = true };
    }
}
