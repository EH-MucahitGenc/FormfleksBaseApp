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

    public SurveyFilesController(IHostEnvironment env, ISystemSettingsService systemSettingsService, ISurveyDbContext surveyContext)
    {
        _env = env;
        _systemSettingsService = systemSettingsService;
        _surveyContext = surveyContext;
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
        // Format: {Token}_{QuestionId}_{FileId}{ext}
        var newFileName = $"{parsedToken:N}_{questionId:N}_{fileId:N}{ext}";
        var filePath = Path.Combine(uploadPath, newFileName);

        using (var stream = new FileStream(filePath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

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
        var uploadPath = Path.Combine(_env.ContentRootPath, "App_Data", "survey-uploads");
        var filePath = Path.Combine(uploadPath, fileName);
        if (!System.IO.File.Exists(filePath))
            return NotFound("Dosya bulunamadı.");
            
        // Authorization check
        // Check if user is authenticated and is admin or survey viewer
        var isAuthenticated = User.Identity?.IsAuthenticated == true;
        var hasManageSurveys = User.HasClaim("Permission", "Surveys.Manage");
        
        bool isAuthorized = false;

        // Find which campaign this file belongs to via SurveyAnswerFiles (if it was submitted)
        var fileRecord = await _surveyContext.SurveyAnswerFiles
            .Include(f => f.SurveyAnswer.SurveyResponse)
            .FirstOrDefaultAsync(f => f.FilePath.Contains(fileName));

        // 1. Participant check via Token
        if (!string.IsNullOrEmpty(token) && Guid.TryParse(token, out var parsedToken))
        {
            var assignment = await _surveyContext.SurveyAssignments.FirstOrDefaultAsync(a => a.Token == parsedToken);
            // Must have a valid assignment, AND the file must be uploaded by this token (checked via prefix)
            if (assignment != null && fileName.StartsWith($"{assignment.Token:N}_"))
            {
                isAuthorized = true;
            }
        }
        
        // 2. Admin/Viewer check
        if (!isAuthorized && isAuthenticated)
        {
            if (hasManageSurveys) 
            {
                isAuthorized = true;
            }
            else if (fileRecord != null)
            {
                var userId = User.FindFirst(ClaimTypes.NameIdentifier)?.Value;
                if (Guid.TryParse(userId, out var uid))
                {
                    var campaignId = fileRecord.SurveyAnswer.SurveyResponse.SurveyCampaignId;
                    var isViewer = await _surveyContext.SurveyResultViewers
                        .AnyAsync(v => v.SurveyCampaignId == campaignId && v.UserId == uid);
                        
                    if (isViewer)
                        isAuthorized = true;
                }
            }
        }

        if (!isAuthorized)
            return Unauthorized("Bu dosyayı görüntüleme yetkiniz yok.");

        var mimeType = "application/octet-stream";
        var extension = Path.GetExtension(fileName).ToLower();
        if (extension == ".pdf") mimeType = "application/pdf";
        else if (extension == ".png") mimeType = "image/png";
        else if (extension == ".jpg" || extension == ".jpeg") mimeType = "image/jpeg";

        return PhysicalFile(filePath, mimeType);
    }
}
