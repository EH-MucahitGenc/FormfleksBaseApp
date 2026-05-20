using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IO;

using FormfleksBaseApp.Application.Common.Interfaces;
using FormfleksBaseApp.Application.Common.Models;

namespace FormfleksBaseApp.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
/// <summary>
/// Dinamik formlar ve sistem genelindeki dosya yükleme (File Upload) işlemlerini yöneten API Controller sınıfıdır.
/// Yüklenen dosyaları güvenlik ve performans amacıyla veritabanı yerine sunucunun wwwroot/uploads dizininde saklar.
/// Path Traversal saldırılarını önlemek için dosyalara benzersiz Guid isimleri atar.
/// </summary>
public class FilesController : ControllerBase
{
    private readonly IWebHostEnvironment _env;
    private readonly ISystemSettingsService _systemSettingsService;

    public FilesController(IWebHostEnvironment env, ISystemSettingsService systemSettingsService)
    {
        _env = env;
        _systemSettingsService = systemSettingsService;
    }

    /// <summary>
    /// Sisteme yeni bir dosya yükler ve erişim linkini (URL) döner.
    /// </summary>
    /// <param name="file">Yüklenecek dosya</param>
    [HttpPost("upload")]
    [RequestSizeLimit(100 * 1024 * 1024)] // 100 MB max allowed generally, handled explicitly in frontend/controller
    public async Task<IActionResult> Upload(IFormFile file)
    {
        if (file == null || file.Length == 0)
            return BadRequest(new { Message = "Geçersiz dosya." });

        // uploads dizini yoksa oluştur
        var uploadPath = Path.Combine(_env.WebRootPath ?? Path.Combine(Directory.GetCurrentDirectory(), "wwwroot"), "uploads");
        if (!Directory.Exists(uploadPath))
            Directory.CreateDirectory(uploadPath);

        // Rastgele isim ve orijinal uzantı
        var extension = Path.GetExtension(file.FileName).ToLower();
        
        var appSettings = _systemSettingsService.GetSetting<AppSettings>("AppSettings") ?? new AppSettings();
        
        var maxSizeBytes = appSettings.MaxUploadSizeMb * 1024 * 1024;
        if (file.Length > maxSizeBytes)
            return BadRequest(new { Message = $"Dosya boyutu çok büyük. Maksimum {appSettings.MaxUploadSizeMb} MB yüklenebilir." });

        if (!string.IsNullOrEmpty(appSettings.AllowedFileTypes) && appSettings.AllowedFileTypes != "*")
        {
            var allowedExtensions = appSettings.AllowedFileTypes.Split(',').Select(x => x.Trim().ToLower()).ToList();
            if (!allowedExtensions.Contains(extension))
                return BadRequest(new { Message = $"Sadece şu dosya tiplerine izin verilmektedir: {appSettings.AllowedFileTypes}" });
        }

        var randomFileName = $"{Guid.NewGuid():N}{extension}";
        var fullPath = Path.Combine(uploadPath, randomFileName);

        using (var stream = new FileStream(fullPath, FileMode.Create))
        {
            await file.CopyToAsync(stream);
        }

        // Dışarıdan erişilebilecek URL (Proxy/Domain arkasında olacağı için BaseUrl alınabilir, veya direkt relative path verilebilir)
        var relativeUrl = $"/uploads/{randomFileName}";
        
        return Ok(new 
        { 
            Url = relativeUrl, 
            FileName = file.FileName,
            Size = file.Length
        });
    }
}
