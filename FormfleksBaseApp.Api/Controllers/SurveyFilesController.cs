using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Domain.Enums.Surveys;
using FormfleksBaseApp.Application.Common.Models;
using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using Microsoft.EntityFrameworkCore;
using Microsoft.Extensions.Hosting;
using System;
using System.IO;
using System.Linq;
using System.Threading.Tasks;
using Microsoft.AspNetCore.Http;
using System.Security.Claims;

namespace FormfleksBaseApp.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
public class SurveyFilesController : ControllerBase
{
    private readonly IHostEnvironment _env;
    private readonly ISystemSettingsService _systemSettingsService;
    private readonly ISurveyDbContext _surveyContext;
    private readonly FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAuthorizationService _authService;

    private readonly FormfleksBaseApp.Application.Common.Interfaces.IDynamicFormsDbContext _dynamicFormsDb;

    public SurveyFilesController(IHostEnvironment env, ISystemSettingsService systemSettingsService, ISurveyDbContext surveyContext, FormfleksBaseApp.Application.Features.Surveys.Common.ISurveyAuthorizationService authService, FormfleksBaseApp.Application.Common.Interfaces.IDynamicFormsDbContext dynamicFormsDb)
    {
        _env = env;
        _systemSettingsService = systemSettingsService;
        _surveyContext = surveyContext;
        _authService = authService;
        _dynamicFormsDb = dynamicFormsDb;
    }

    [HttpPost("upload")]
    [RequestSizeLimit(100 * 1024 * 1024)]
    [AllowAnonymous]
    public async Task<IActionResult> Upload([FromForm] string token, [FromForm] Guid questionId, IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { Message = "Geçersiz dosya." });

        if (!Guid.TryParse(token, out var parsedToken))
            return Unauthorized(new { Message = "Geçersiz veya eksik token." });

        // Validate Token
        var assignment = await _surveyContext.SurveyAssignments
            .Include(a => a.SurveyCampaign)
            .FirstOrDefaultAsync(a => a.Token == parsedToken);

        if (assignment == null)
            return Unauthorized(new { Message = "Geçersiz token. Katılımcı kaydı bulunamadı." });

        if (assignment.Status == SurveyAssignmentStatus.Completed)
            return BadRequest(new { Message = "Bu anketi zaten doldurdunuz." });

        if (assignment.SurveyCampaign.Status != SurveyCampaignStatus.Published)
            return BadRequest(new { Message = "Kampanya aktif değil." });

        // Validate Question
        var question = await _surveyContext.SurveyVersionQuestions
            .FirstOrDefaultAsync(q => q.Id == questionId && q.SurveyVersionSection.SurveyTemplateVersionId == assignment.SurveyCampaign.SurveyTemplateVersionId);

        if (question == null || question.QuestionType != SurveyQuestionType.File)
            return BadRequest(new { Message = "Geçersiz veya dosya yüklemeye uygun olmayan soru." });

        var uploadPath = Path.Combine(_env.ContentRootPath, "App_Data", "survey-uploads");
        if (!Directory.Exists(uploadPath))
            Directory.CreateDirectory(uploadPath);

        var extension = Path.GetExtension(file.FileName).ToLower();
        var appSettings = _systemSettingsService.GetSetting<AppSettings>("AppSettings") ?? new AppSettings();
        
        var maxSizeBytes = appSettings.MaxUploadSizeMb * 1024 * 1024;
        if (file.Length > maxSizeBytes)
            return BadRequest(new { Message = $"Dosya boyutu çok büyük. Maksimum {appSettings.MaxUploadSizeMb} MB yüklenebilir." });

        // Clean file name for Path Traversal
        var safeFileName = Path.GetFileName(file.FileName);
        if (!string.IsNullOrEmpty(appSettings.AllowedFileTypes) && appSettings.AllowedFileTypes != "*")
        {
            var allowedExtensions = appSettings.AllowedFileTypes.Split(',').Select(x => x.Trim().ToLower()).ToList();
            if (!allowedExtensions.Contains(extension))
                return BadRequest(new { Message = $"Sadece şu dosya tiplerine izin verilmektedir: {appSettings.AllowedFileTypes}" });
        }
        
        var fileId = Guid.NewGuid();
        var ext = Path.GetExtension(file.FileName);
        // Secure Storage Key: only random guid, NO token in file name!
        var newFileName = $"{fileId:N}{ext}";
        var filePath = Path.Combine(uploadPath, newFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Create temp upload record
        var tempRecord = new FormfleksBaseApp.Domain.Entities.Surveys.SurveyTempFileUpload
        {
            Id = Guid.NewGuid(),
            Token = parsedToken,
            QuestionId = questionId,
            StorageKey = newFileName,
            OriginalFileName = file.FileName,
            ContentType = file.ContentType,
            FileSize = file.Length,
            ExpiresAt = DateTime.UtcNow.AddHours(24) // Expire after 24h if not submitted
        };
        _surveyContext.SurveyTempFileUploads.Add(tempRecord);
        await _surveyContext.SaveChangesAsync();

        return Ok(new
        {
            FileId = newFileName,
            FileName = file.FileName,
            Size = file.Length,
            ContentType = file.ContentType
        });
    }

    [HttpGet("{fileName}")]
    [AllowAnonymous]
    public async Task<IActionResult> Download(string fileName, [FromQuery] string? token = null)
    {
        // 1. Path traversal / Normalize filename check
        var safeFileName = Path.GetFileName(fileName);
        if (fileName != safeFileName)
            return BadRequest("Geçersiz dosya adı.");

        var uploadPath = Path.Combine(_env.ContentRootPath, "App_Data", "survey-uploads");
        var filePath = Path.Combine(uploadPath, safeFileName);
            
        // Authorization check
        var isAuthenticated = User.Identity?.IsAuthenticated == true;
        bool isAuthorized = false;

        // Find which campaign this file belongs to via SurveyAnswerFiles (if it was submitted)
        // FilePath.Contains yerine tam eşitlik kullan. (File path sadece dosya adını tutuyor kabul ederek)
        var fileRecord = await _surveyContext.SurveyAnswerFiles
            .Include(f => f.SurveyAnswer.SurveyResponse)
            .FirstOrDefaultAsync(f => f.FilePath == safeFileName);

        // 1. Participant check via Token
        if (!string.IsNullOrEmpty(token) && Guid.TryParse(token, out var parsedToken))
        {
            var assignment = await _surveyContext.SurveyAssignments.FirstOrDefaultAsync(a => a.Token == parsedToken);
            if (assignment != null)
            {
                // Is this a temp file they just uploaded?
                var isTempFile = await _surveyContext.SurveyTempFileUploads
                    .AnyAsync(t => t.Token == parsedToken && t.StorageKey == safeFileName);
                if (isTempFile) isAuthorized = true;
            }
        }
        
        // 2. Admin/Viewer check
        if (!isAuthorized && isAuthenticated && fileRecord != null)
        {
            var userIdStr = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
            if (Guid.TryParse(userIdStr, out var uid))
            {
                var campaignId = fileRecord.SurveyAnswer.SurveyResponse.SurveyCampaignId;
                
                isAuthorized = await _authService.HasCampaignPermissionAsync(uid, campaignId, FormfleksBaseApp.Domain.Enums.Surveys.SurveyAction.ViewResponseFiles);
            }
        }

        if (!isAuthorized)
        {
            // Do not leak file existence
            return Unauthorized("Bu dosyayı görüntüleme yetkiniz yok.");
        }

        // Only after authorization, check physical existence
        if (!System.IO.File.Exists(filePath))
            return NotFound("Dosya bulunamadı.");

        var mimeType = "application/octet-stream";
        var extension = Path.GetExtension(safeFileName).ToLower();
        if (extension == ".pdf") mimeType = "application/pdf";
        else if (extension == ".png") mimeType = "image/png";
        else if (extension == ".jpg" || extension == ".jpeg") mimeType = "image/jpeg";

        if (isAuthenticated && fileRecord != null && string.IsNullOrEmpty(token))
        {
            if (Guid.TryParse(User.FindFirst(ClaimTypes.NameIdentifier)?.Value, out var uid))
            {
                _dynamicFormsDb.AuditLogs.Add(new FormfleksBaseApp.Domain.Entities.DynamicForms.AuditLogEntity
                {
                    Id = Guid.NewGuid(),
                    EntityType = "SurveyCampaign",
                    EntityId = fileRecord.SurveyAnswer.SurveyResponse.SurveyCampaignId,
                    ActionType = "ResponseFileDownloaded",
                    ActorUserId = uid,
                    DetailJson = System.Text.Json.JsonSerializer.Serialize(new { 
                        FileName = safeFileName,
                        ResponseId = fileRecord.SurveyAnswer.SurveyResponseId
                    }),
                    CreatedAt = DateTime.UtcNow
                });
                await _dynamicFormsDb.SaveChangesAsync(default);
            }
        }

        return PhysicalFile(filePath, mimeType, fileRecord?.FileName ?? safeFileName);
    }
}
