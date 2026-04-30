using Microsoft.AspNetCore.Authorization;
using Microsoft.AspNetCore.Mvc;
using System.IO;

namespace FormfleksBaseApp.Api.Controllers;

[Route("api/[controller]")]
[ApiController]
[Authorize]
public class FilesController : ControllerBase
{
    private readonly IWebHostEnvironment _env;

    public FilesController(IWebHostEnvironment env)
    {
        _env = env;
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
        var extension = Path.GetExtension(file.FileName);
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
